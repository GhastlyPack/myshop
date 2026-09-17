import "server-only";
import Stripe from "stripe";
import { env, stripeConfigured } from "@/lib/env";
import type { Order } from "@/db/schema";
import type { CheckoutInput } from "./index";

/**
 * Stripe Connect (Standard) adapter. The platform holds one secret key; every
 * money-moving call runs on the creator's connected account via the
 * per-request `{ stripeAccount }` option, so buyers pay the creator directly.
 *
 * The client is reached through `getStripe()` so tests can swap in a fake
 * with `setStripeClient()` — nothing else in the codebase news up `Stripe`.
 */

let client: Stripe | null = null;

export class StripeNotConfiguredError extends Error {
  constructor() {
    super("Stripe isn't configured on this deployment (STRIPE_SECRET_KEY / STRIPE_CONNECT_CLIENT_ID).");
    this.name = "StripeNotConfiguredError";
  }
}

export function getStripe(): Stripe {
  if (client) return client;
  if (!stripeConfigured || !env.STRIPE_SECRET_KEY) throw new StripeNotConfiguredError();
  client = new Stripe(env.STRIPE_SECRET_KEY, {
    appInfo: { name: "visitmy.shop", url: env.APP_BASE_URL },
    maxNetworkRetries: 2,
  });
  return client;
}

/** Test hook: inject a fake client (scripts/test-payments.ts). Pass null to reset. */
export function setStripeClient(fake: Stripe | null) {
  client = fake;
}

export const STRIPE_CALLBACK_PATH = "/api/payments/stripe/callback";

export function stripeCallbackUrl() {
  return new URL(STRIPE_CALLBACK_PATH, env.APP_BASE_URL).toString();
}

/** Connect Standard OAuth authorize URL. `state` must be a signed token (see connect-state.ts). */
export function connectUrl(_storeId: string, state: string) {
  if (!env.STRIPE_CONNECT_CLIENT_ID) throw new StripeNotConfiguredError();
  const u = new URL("https://connect.stripe.com/oauth/authorize");
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", env.STRIPE_CONNECT_CLIENT_ID);
  u.searchParams.set("scope", "read_write");
  u.searchParams.set("state", state);
  u.searchParams.set("redirect_uri", stripeCallbackUrl());
  return u.toString();
}

export type ConnectedAccount = { accountId: string; livemode: boolean; scope: string | null };

/** Exchange the OAuth `code` for the connected account id. */
export async function exchangeCode(code: string): Promise<ConnectedAccount> {
  const token = await getStripe().oauth.token({ grant_type: "authorization_code", code });
  if (!token.stripe_user_id) throw new Error("Stripe OAuth response had no stripe_user_id");
  return { accountId: token.stripe_user_id, livemode: Boolean(token.livemode), scope: token.scope ?? null };
}

export type AccountStatus = {
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  email: string | null;
  /** Stripe requirement keys the account still has to satisfy (e.g. "external_account", "tos_acceptance.date"). */
  currentlyDue: string[];
  /** Stripe's reason charges are off, e.g. "requirements.past_due", or null. */
  disabledReason: string | null;
};

export async function getAccountStatus(accountId: string): Promise<AccountStatus> {
  const acct = await getStripe().accounts.retrieve(accountId);
  return {
    chargesEnabled: Boolean(acct.charges_enabled),
    payoutsEnabled: Boolean(acct.payouts_enabled),
    detailsSubmitted: Boolean(acct.details_submitted),
    email: acct.email ?? null,
    currentlyDue: acct.requirements?.currently_due ?? [],
    disabledReason: acct.requirements?.disabled_reason ?? null,
  };
}

/** Revoke our access to the connected account (creator clicked Disconnect). */
export async function deauthorize(accountId: string): Promise<void> {
  if (!env.STRIPE_CONNECT_CLIENT_ID) throw new StripeNotConfiguredError();
  await getStripe().oauth.deauthorize({ client_id: env.STRIPE_CONNECT_CLIENT_ID, stripe_user_id: accountId });
}

/** Platform fee in cents for an amount, from the store's bps. 0 today. */
export function platformFeeCents(amountCents: number, platformFeeBps: number) {
  if (!platformFeeBps || platformFeeBps <= 0) return 0;
  return Math.round((amountCents * platformFeeBps) / 10000);
}

/**
 * Hosted Checkout Session on the creator's account. The order id rides along as
 * `client_reference_id` + metadata, and the same metadata is copied onto the
 * PaymentIntent (and therefore the Charge) so `charge.refunded` can find the order.
 */
export async function createCheckoutSession(input: CheckoutInput, accountId: string): Promise<Stripe.Checkout.Session> {
  const fee = platformFeeCents(input.amountCents, input.platformFeeBps);
  const metadata = { orderId: input.orderId, storeId: input.storeId, productId: input.productId, platformFeeCents: String(fee) };
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: input.currency.toLowerCase(),
          unit_amount: input.amountCents,
          product_data: { name: input.title },
        },
        quantity: 1,
      },
    ],
    customer_email: input.buyerEmail,
    client_reference_id: input.orderId,
    metadata,
    payment_intent_data: {
      metadata,
      ...(fee > 0 ? { application_fee_amount: fee } : {}),
    },
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    allow_promotion_codes: false,
  };
  return getStripe().checkout.sessions.create(params, { stripeAccount: accountId });
}

export type RefundResult = { refundId: string; amountCents: number };

/**
 * Full refund of a paid Stripe order on the connected account. Resolves the
 * PaymentIntent from the Checkout Session we stored as `providerRef`. The
 * `charge.refunded` webhook flips the order + revokes entitlements; callers
 * may also do that optimistically when this resolves.
 */
export async function refundOrder(
  order: Pick<Order, "id" | "providerRef" | "platformFeeCents" | "provider">,
  accountId: string,
): Promise<RefundResult> {
  if (order.provider !== "stripe" || !order.providerRef) throw new Error("Order has no Stripe checkout session to refund.");
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(order.providerRef, {}, { stripeAccount: accountId });
  const pi = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  if (!pi) throw new Error("No payment found on this checkout session yet.");
  const refund = await stripe.refunds.create(
    {
      payment_intent: pi,
      metadata: { orderId: order.id },
      // Give the creator back our cut too (no-op while the fee is 0).
      ...(order.platformFeeCents > 0 ? { refund_application_fee: true } : {}),
    },
    { stripeAccount: accountId, idempotencyKey: `refund_${order.id}` },
  );
  return { refundId: refund.id, amountCents: refund.amount };
}
