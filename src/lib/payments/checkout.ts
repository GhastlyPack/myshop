import "server-only";
import type { CheckoutInput, CheckoutSession } from "./index";

/**
 * Paid checkout entry point used by the product page.
 * STUB — replaced by the Stripe Connect implementation (M4).
 * Contract: given a pending order, return a redirect URL to the provider's hosted checkout.
 */
export async function startPaidCheckout(_input: CheckoutInput): Promise<{ ok: true; session: CheckoutSession } | { ok: false; error: string }> {
  return { ok: false, error: "Payments aren't set up for this store yet." };
}

/** True if the store can accept paid checkouts right now. STUB until M4. */
export async function storeCanTakePayments(_storeId: string): Promise<boolean> {
  return false;
}
