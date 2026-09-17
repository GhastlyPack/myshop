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

export type CheckoutInput = {
  orderId: string;
  storeId: string;
  productId: string;
  amountCents: number;
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
