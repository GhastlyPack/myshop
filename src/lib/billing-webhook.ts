import "server-only";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { planFromLookupKey } from "@/lib/billing";
import { getStripe } from "@/lib/payments/stripe";

/**
 * Subscription webhook handling for OUR billing, HTTP-free so it can be driven
 * from a script with hand-built events (see scripts/test-billing.ts). These
 * events fire on the *platform* account (no `event.account`), unlike the Connect
 * webhook in src/lib/payments/webhook.ts.
 *
 * Every handler is idempotent — it writes the current state onto the row, so a
 * Stripe retry or out-of-order delivery converges to the same result.
 */
export type BillingWebhookResult = { handled: boolean; action: string; userId?: string; reason?: string };

export type BillingDeps = { stripe: () => Stripe };
const defaultDeps: BillingDeps = { stripe: getStripe };

/** Map a Stripe subscription status onto our narrower set. */
export function mapStatus(s: Stripe.Subscription.Status): string {
  switch (s) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
    case "unpaid":
    case "paused":
      return "past_due";
    case "incomplete":
      return "incomplete";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    default:
      return "canceled";
  }
}

type SubShape = {
  status: string;
  plan?: "basic" | "pro";
  interval?: "month" | "year";
  stripePriceLookupKey?: string | null;
  stripeSubscriptionId: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
  trialEndsAt: Date | null;
};

/** Pull the fields we store off a Stripe Subscription. `price.lookup_key` must be present (expand it). */
export function subscriptionToRow(sub: Stripe.Subscription): SubShape {
  const item = sub.items?.data?.[0];
  const price = item?.price;
  const lookupKey = price?.lookup_key ?? null;
  const mapped = planFromLookupKey(lookupKey);
  const interval: "month" | "year" | undefined = mapped?.interval ?? (price?.recurring?.interval === "year" ? "year" : price?.recurring?.interval === "month" ? "month" : undefined);
  // `current_period_end` sits on the subscription in older API versions and on the item in newer ones; read whichever is present.
  const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end ?? (item as unknown as { current_period_end?: number } | undefined)?.current_period_end ?? null;
  return {
    status: mapStatus(sub.status),
    plan: mapped?.plan,
    interval,
    stripePriceLookupKey: lookupKey,
    stripeSubscriptionId: sub.id,
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
    trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
  };
}

/** Resolve which of our rows an event belongs to. Prefers metadata.userId, then the stored sub/customer ids. */
async function findRowUserId(opts: { userId?: string | null; subscriptionId?: string | null; customerId?: string | null }): Promise<string | null> {
  if (opts.userId) {
    const row = await db.query.subscriptions.findFirst({ where: eq(subscriptions.userId, opts.userId), columns: { userId: true } });
    if (row) return row.userId;
  }
  if (opts.subscriptionId) {
    const row = await db.query.subscriptions.findFirst({ where: eq(subscriptions.stripeSubscriptionId, opts.subscriptionId), columns: { userId: true } });
    if (row) return row.userId;
  }
  if (opts.customerId) {
    const row = await db.query.subscriptions.findFirst({ where: eq(subscriptions.stripeCustomerId, opts.customerId), columns: { userId: true } });
    if (row) return row.userId;
  }
  return null;
}

const asId = (v: string | { id: string } | null | undefined): string | null => (typeof v === "string" ? v : (v?.id ?? null));

export async function handleBillingEvent(event: Stripe.Event, deps: BillingDeps = defaultDeps): Promise<BillingWebhookResult> {
  switch (event.type) {
    case "checkout.session.completed":
      return handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, deps);
    case "customer.subscription.created":
    case "customer.subscription.updated":
      return handleSubscriptionUpsert(event.data.object as Stripe.Subscription);
    case "customer.subscription.deleted":
      return handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
    case "invoice.payment_failed":
      return handlePaymentFailed(event.data.object as Stripe.Invoice);
    default:
      return { handled: false, action: "ignored", reason: `unhandled event type ${event.type}` };
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, deps: BillingDeps): Promise<BillingWebhookResult> {
  if (session.mode !== "subscription") return { handled: false, action: "ignored", reason: `mode=${session.mode}` };
  const subId = asId(session.subscription);
  if (!subId) return { handled: false, action: "ignored", reason: "no subscription on session" };

  const userId = await findRowUserId({
    userId: session.client_reference_id ?? session.metadata?.userId ?? null,
    subscriptionId: subId,
    customerId: asId(session.customer),
  });
  if (!userId) return { handled: false, action: "ignored", reason: `no subscription row for session ${session.id}` };

  // Fetch the full subscription (the session doesn't carry items/price/period).
  const sub = await deps.stripe().subscriptions.retrieve(subId, { expand: ["items.data.price"] });
  const shape = subscriptionToRow(sub);
  await db
    .update(subscriptions)
    .set({
      status: shape.status,
      ...(shape.plan ? { plan: shape.plan } : {}),
      ...(shape.interval ? { interval: shape.interval } : {}),
      stripePriceLookupKey: shape.stripePriceLookupKey,
      stripeSubscriptionId: shape.stripeSubscriptionId,
      stripeCustomerId: asId(session.customer) ?? undefined,
      cancelAtPeriodEnd: shape.cancelAtPeriodEnd,
      currentPeriodEnd: shape.currentPeriodEnd,
      ...(shape.trialEndsAt ? { trialEndsAt: shape.trialEndsAt } : {}),
    })
    .where(eq(subscriptions.userId, userId));
  return { handled: true, action: "checkout_completed", userId };
}

async function handleSubscriptionUpsert(sub: Stripe.Subscription): Promise<BillingWebhookResult> {
  const userId = await findRowUserId({ userId: sub.metadata?.userId ?? null, subscriptionId: sub.id, customerId: asId(sub.customer) });
  if (!userId) return { handled: false, action: "ignored", reason: `no subscription row for ${sub.id}` };
  const shape = subscriptionToRow(sub);
  await db
    .update(subscriptions)
    .set({
      status: shape.status,
      ...(shape.plan ? { plan: shape.plan } : {}),
      ...(shape.interval ? { interval: shape.interval } : {}),
      stripePriceLookupKey: shape.stripePriceLookupKey,
      stripeSubscriptionId: shape.stripeSubscriptionId,
      cancelAtPeriodEnd: shape.cancelAtPeriodEnd,
      currentPeriodEnd: shape.currentPeriodEnd,
      ...(shape.trialEndsAt ? { trialEndsAt: shape.trialEndsAt } : {}),
    })
    .where(eq(subscriptions.userId, userId));
  return { handled: true, action: "subscription_updated", userId };
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription): Promise<BillingWebhookResult> {
  const userId = await findRowUserId({ userId: sub.metadata?.userId ?? null, subscriptionId: sub.id, customerId: asId(sub.customer) });
  if (!userId) return { handled: false, action: "ignored", reason: `no subscription row for ${sub.id}` };
  await db.update(subscriptions).set({ status: "canceled", cancelAtPeriodEnd: false }).where(eq(subscriptions.userId, userId));
  return { handled: true, action: "subscription_deleted", userId };
}

async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<BillingWebhookResult> {
  const subId = asId((invoice as unknown as { subscription?: string | { id: string } }).subscription);
  const userId = await findRowUserId({ subscriptionId: subId, customerId: asId(invoice.customer) });
  if (!userId) return { handled: false, action: "ignored", reason: `no subscription row for invoice ${invoice.id}` };
  await db.update(subscriptions).set({ status: "past_due" }).where(eq(subscriptions.userId, userId));
  return { handled: true, action: "payment_failed", userId };
}
