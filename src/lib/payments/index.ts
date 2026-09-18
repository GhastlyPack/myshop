import "server-only";
import { paypalConfigured, stripeConfigured } from "@/lib/env";

/**
 * Payment provider surface used by the checkout + settings UI.
 * Concrete implementations live in ./stripe.ts and ./paypal.ts (M4 / M7).
 *
 * Model: creators connect THEIR OWN Stripe (Connect Standard, OAuth) / PayPal
 * (Commerce Platform). Buyers pay the creator directly. Our platform fee is
 * `stores.platform_fee_bps` and is 0 until Commas / app-fee billing lands —
 * the plumbing passes it through so turning it on is a config change.
 */
export type Provider = "stripe" | "paypal";

export type CheckoutBump = { productId: string; title: string; amountCents: number };

export type CheckoutInput = {
  orderId: string;
  storeId: string;
  productId: string;
  /** Main product price after any discount code. The bump (if any) is added on top. */
  amountCents: number;
  /** Optional order bump; becomes a second Stripe line item. (Legacy single; prefer `bumps`.) */
  bump?: CheckoutBump | null;
  /** Every accepted order bump; each becomes its own line item. */
  bumps?: CheckoutBump[];
  currency: string;
  buyerEmail: string;
  buyerName: string;
  title: string;
  successUrl: string;
  cancelUrl: string;
  platformFeeBps: number;
};

export type CheckoutSession = { provider: Provider; redirectUrl: string; providerRef: string };

export const providerStatus = {
  stripe: stripeConfigured,
  paypal: paypalConfigured,
} as const;

export function anyProviderConfigured() {
  return providerStatus.stripe || providerStatus.paypal;
}
