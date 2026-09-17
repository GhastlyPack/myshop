import "server-only";
import type Stripe from "stripe";
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { entitlements, orders, paymentAccounts, products, stores } from "@/db/schema";
import { newId, newToken } from "@/lib/ids";
import { track } from "@/lib/track";
import { sendPaidDeliveryEmail, thanksUrl } from "./email";
import { getStripe } from "./stripe";

/**
 * Stripe Connect webhook handling, HTTP-free so it can be exercised from a
 * script with hand-built events. Every handler is idempotent: Stripe retries
 * and can deliver the same event more than once.
 *
 * Events come from the platform's *Connect* endpoint, so `event.account` is the
 * creator's account id. We always check it matches the store's connected
 * account before touching an order.
 */
export type WebhookResult = {
  handled: boolean;
  action: string;
  orderId?: string;
  reason?: string;
};

export type WebhookDeps = {
  /** Lazily resolved so unconfigured deployments never construct a client unless needed. */
  stripe: () => Stripe;
};

const defaultDeps: WebhookDeps = { stripe: getStripe };

export async function handleStripeEvent(event: Stripe.Event, deps: WebhookDeps = defaultDeps): Promise<WebhookResult> {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      return handleCheckoutPaid(event.data.object, event.account ?? null);
    case "charge.refunded":
      return handleChargeRefunded(event.data.object, event.account ?? null, deps);
    case "account.updated":
      return handleAccountUpdated(event.data.object);
    case "account.application.deauthorized":
      return handleDeauthorized(event.account ?? null);
    default:
      return { handled: false, action: "ignored", reason: `unhandled event type ${event.type}` };
  }
}

// ---------- checkout.session.completed ----------

export async function handleCheckoutPaid(session: Stripe.Checkout.Session, account: string | null): Promise<WebhookResult> {
  if (session.payment_status !== "paid") {
    return { handled: false, action: "ignored", reason: `payment_status=${session.payment_status}` };
  }
  if (!account) return { handled: false, action: "ignored", reason: "no connected account on event" };

  const refId = session.client_reference_id ?? session.metadata?.orderId ?? null;
  const order =
    (await db.query.orders.findFirst({ where: eq(orders.providerRef, session.id) })) ??
    (refId ? await db.query.orders.findFirst({ where: eq(orders.id, refId) }) : undefined);
  if (!order) return { handled: false, action: "ignored", reason: `no order for session ${session.id}` };

  const acct = await db.query.paymentAccounts.findFirst({
    where: and(eq(paymentAccounts.storeId, order.storeId), eq(paymentAccounts.provider, "stripe")),
  });
  if (!acct || acct.externalId !== account) {
    return { handled: false, action: "ignored", orderId: order.id, reason: "event account does not match store's connected account" };
  }
  if (order.status === "paid") return { handled: true, action: "already_paid", orderId: order.id };

  const feeFromMeta = Number(session.metadata?.platformFeeCents ?? NaN);
  const platformFee = Number.isFinite(feeFromMeta) ? feeFromMeta : order.platformFeeCents;

  // Flip pending → paid atomically; a concurrent duplicate delivery gets zero rows back.
  const [updated] = await db
    .update(orders)
    .set({
      status: "paid",
      provider: "stripe",
      providerRef: session.id,
      amountCents: session.amount_total ?? order.amountCents,
      currency: (session.currency ?? order.currency).toLowerCase(),
      platformFeeCents: platformFee,
    })
    .where(and(eq(orders.id, order.id), ne(orders.status, "paid")))
    .returning();
  if (!updated) return { handled: true, action: "already_paid", orderId: order.id };

  let ent = await db.query.entitlements.findFirst({ where: eq(entitlements.orderId, order.id) });
  if (!ent) {
    [ent] = await db
      .insert(entitlements)
      .values({ id: newId("ent"), orderId: order.id, productId: order.productId, buyerEmail: order.buyerEmail, token: newToken() })
      .returning();
  } else if (ent.revoked) {
    // Re-paid after a refund (rare); make sure the buyer can download again.
    await db.update(entitlements).set({ revoked: false }).where(eq(entitlements.id, ent.id));
  }

  const [store, product] = await Promise.all([
    db.query.stores.findFirst({ where: eq(stores.id, order.storeId) }),
    db.query.products.findFirst({ where: eq(products.id, order.productId) }),
  ]);

  if (store && product) {
    try {
      await sendPaidDeliveryEmail({
        to: order.buyerEmail,
        buyerName: order.buyerName,
        storeName: store.displayName,
        productTitle: product.title,
        amountCents: updated.amountCents,
        currency: updated.currency,
        thanksUrl: thanksUrl(store.username, product.slug, ent.token),
        confirmationSubject: product.confirmationSubject,
        confirmationBody: product.confirmationBody,
      });
    } catch (e) {
      // The order is paid and the entitlement exists; don't let a mail hiccup trigger Stripe retries.
      console.error("[webhook] delivery email failed", order.id, e);
    }
  }

  await track({ storeId: order.storeId, productId: order.productId, type: "purchase", source: order.source });
  return { handled: true, action: "paid", orderId: order.id };
}

// ---------- charge.refunded ----------

export async function handleChargeRefunded(charge: Stripe.Charge, account: string | null, deps: WebhookDeps = defaultDeps): Promise<WebhookResult> {
  if (!account) return { handled: false, action: "ignored", reason: "no connected account on event" };
  const fullyRefunded = charge.refunded || charge.amount_refunded >= charge.amount;
  if (!fullyRefunded) {
    return { handled: false, action: "ignored", reason: `partial refund (${charge.amount_refunded}/${charge.amount})` };
  }

  let order = charge.metadata?.orderId ? await db.query.orders.findFirst({ where: eq(orders.id, charge.metadata.orderId) }) : undefined;
  if (!order) {
    // Older/foreign charges: walk PaymentIntent → Checkout Session → providerRef.
    const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
    if (pi) {
      try {
        const list = await deps.stripe().checkout.sessions.list({ payment_intent: pi, limit: 1 }, { stripeAccount: account });
        const sessionId = list.data[0]?.id;
        if (sessionId) order = await db.query.orders.findFirst({ where: eq(orders.providerRef, sessionId) });
      } catch (e) {
        console.error("[webhook] session lookup for refund failed", e);
      }
    }
  }
  if (!order) return { handled: false, action: "ignored", reason: `no order for charge ${charge.id}` };

  const acct = await db.query.paymentAccounts.findFirst({
    where: and(eq(paymentAccounts.storeId, order.storeId), eq(paymentAccounts.provider, "stripe")),
  });
  if (!acct || acct.externalId !== account) {
    return { handled: false, action: "ignored", orderId: order.id, reason: "event account does not match store's connected account" };
  }

  await markOrderRefunded(order.id);
  return { handled: true, action: order.status === "refunded" ? "already_refunded" : "refunded", orderId: order.id };
}

/** Shared by the webhook and the dashboard's optimistic refund path. */
export async function markOrderRefunded(orderId: string) {
  await db.update(orders).set({ status: "refunded" }).where(eq(orders.id, orderId));
  await db.update(entitlements).set({ revoked: true }).where(eq(entitlements.orderId, orderId));
}

// ---------- account.* ----------

async function handleAccountUpdated(acct: Stripe.Account): Promise<WebhookResult> {
  const [row] = await db
    .update(paymentAccounts)
    .set({
      chargesEnabled: Boolean(acct.charges_enabled),
      details: sql`${paymentAccounts.details} || ${JSON.stringify({
        email: acct.email ?? null,
        detailsSubmitted: Boolean(acct.details_submitted),
        payoutsEnabled: Boolean(acct.payouts_enabled),
      })}::jsonb`,
    })
    .where(and(eq(paymentAccounts.provider, "stripe"), eq(paymentAccounts.externalId, acct.id)))
    .returning({ id: paymentAccounts.id });
  return row ? { handled: true, action: "account_updated" } : { handled: false, action: "ignored", reason: `unknown account ${acct.id}` };
}

async function handleDeauthorized(account: string | null): Promise<WebhookResult> {
  if (!account) return { handled: false, action: "ignored", reason: "no connected account on event" };
  const rows = await db
    .delete(paymentAccounts)
    .where(and(eq(paymentAccounts.provider, "stripe"), eq(paymentAccounts.externalId, account)))
    .returning({ id: paymentAccounts.id });
  return rows.length ? { handled: true, action: "disconnected" } : { handled: false, action: "ignored", reason: `unknown account ${account}` };
}
