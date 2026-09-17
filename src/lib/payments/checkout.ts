import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, paymentAccounts } from "@/db/schema";
import { stripeConfigured } from "@/lib/env";
import type { CheckoutInput, CheckoutSession } from "./index";
import { createCheckoutSession, platformFeeCents } from "./stripe";

/**
 * Paid checkout entry point used by the product page (Package B).
 * Given a pending order, creates a Stripe Checkout Session on the creator's
 * connected account and returns the hosted-checkout URL.
 */
export type StartCheckoutResult = { ok: true; session: CheckoutSession } | { ok: false; error: string };

const NOT_READY = "Payments aren't set up for this store yet.";
const GENERIC_FAIL = "We couldn't start checkout. Please try again in a moment.";

export async function getStripeAccount(storeId: string) {
  return (
    (await db.query.paymentAccounts.findFirst({
      where: and(eq(paymentAccounts.storeId, storeId), eq(paymentAccounts.provider, "stripe")),
    })) ?? null
  );
}

/** True if the store can accept paid checkouts right now. */
export async function storeCanTakePayments(storeId: string): Promise<boolean> {
  if (!stripeConfigured) return false;
  const acct = await getStripeAccount(storeId);
  return Boolean(acct?.chargesEnabled);
}

export async function startPaidCheckout(input: CheckoutInput): Promise<StartCheckoutResult> {
  const fail = async (error: string) => {
    try {
      await db.update(orders).set({ status: "failed" }).where(and(eq(orders.id, input.orderId), eq(orders.status, "pending")));
    } catch (e) {
      console.error("[checkout] could not mark order failed", e);
    }
    return { ok: false as const, error };
  };

  if (!stripeConfigured) return fail(NOT_READY);
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) return fail("This product can't be bought right now.");

  const acct = await getStripeAccount(input.storeId);
  if (!acct?.chargesEnabled) return fail(NOT_READY);

  try {
    const session = await createCheckoutSession(input, acct.externalId);
    if (!session.url) throw new Error("Checkout session has no url");
    await db
      .update(orders)
      .set({
        provider: "stripe",
        providerRef: session.id,
        platformFeeCents: platformFeeCents(input.amountCents, input.platformFeeBps),
        amountCents: input.amountCents,
        currency: input.currency.toLowerCase(),
      })
      .where(eq(orders.id, input.orderId));
    return { ok: true, session: { provider: "stripe", redirectUrl: session.url, providerRef: session.id } };
  } catch (e) {
    console.error("[checkout] stripe session failed", e);
    return fail(GENERIC_FAIL);
  }
}
