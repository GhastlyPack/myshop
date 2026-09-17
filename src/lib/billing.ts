import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "@/db";
import { subscriptions, type Subscription, type User } from "@/db/schema";
import { billingConfigured } from "@/lib/env";
import { newId } from "@/lib/ids";
import { getStripe } from "@/lib/payments/stripe";

/**
 * Our own subscription billing — the creator is a *customer paying us* on the
 * platform Stripe account (getStripe()), a different object graph from Connect
 * (buyers → the creator's connected account). See src/lib/payments/stripe.ts.
 *
 * `resolvePlan` is the one primitive everything else reads: it turns the stored
 * subscription row into the *effective* plan (tier + transaction fee) the rest
 * of the app gates on. It is cheap and cached per request.
 */

export type Tier = "basic" | "pro";
export const PRO_FEE_BPS = 0 as const;
export const BASIC_FEE_BPS = 500 as const; // 5%

/** Full Pro trial length for new signups. */
export const TRIAL_DAYS = 14;

/** Stripe Price lookup keys — no hardcoded price ids anywhere. */
export const LOOKUP_KEYS = {
  basic_monthly: "basic_monthly",
  basic_yearly: "basic_yearly",
  pro_monthly: "pro_monthly",
  pro_yearly: "pro_yearly",
} as const;
export type LookupKey = (typeof LOOKUP_KEYS)[keyof typeof LOOKUP_KEYS];

/** Final pricing (cents). Basic $9/mo · $90/yr · 5% fee. Pro $49/mo · $490/yr · 0% fee. */
export const PLAN_PRICES: Record<LookupKey, { plan: Tier; interval: "month" | "year"; amountCents: number }> = {
  basic_monthly: { plan: "basic", interval: "month", amountCents: 900 },
  basic_yearly: { plan: "basic", interval: "year", amountCents: 9000 },
  pro_monthly: { plan: "pro", interval: "month", amountCents: 4900 },
  pro_yearly: { plan: "pro", interval: "year", amountCents: 49000 },
};

export function lookupKeyFor(plan: Tier, interval: "month" | "year"): LookupKey {
  return `${plan}_${interval === "year" ? "yearly" : "monthly"}` as LookupKey;
}

export function planFromLookupKey(key: string | null | undefined): { plan: Tier; interval: "month" | "year" } | null {
  if (!key || !(key in PLAN_PRICES)) return null;
  const p = PLAN_PRICES[key as LookupKey];
  return { plan: p.plan, interval: p.interval };
}

export type EffectivePlan = {
  tier: Tier;
  feeBps: typeof PRO_FEE_BPS | typeof BASIC_FEE_BPS;
  trialing: boolean;
  /** Raw subscription status, or "none" when the user has no row. */
  status: string;
  trialEndsAt: Date | null;
  /** End of the current paid period (renews or, if cancelling, ends, on this date). */
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  /** Grandfathered (comped Pro forever). */
  grandfathered: boolean;
  /** They have a Stripe customer, so "Manage billing" (the portal) is available. */
  manageable: boolean;
};

/** The subscription row for a user, cached for the lifetime of the request. */
export const getSubscription = cache(async (userId: string): Promise<Subscription | null> => {
  return (await db.query.subscriptions.findFirst({ where: eq(subscriptions.userId, userId) })) ?? null;
});

/** Pure resolver — unit-testable without a DB (see scripts/test-billing.ts). */
export function resolveEffectivePlan(sub: Subscription | null, now: Date = new Date()): EffectivePlan {
  const trialEndsAt = sub?.trialEndsAt ?? null;
  const currentPeriodEnd = sub?.currentPeriodEnd ?? null;
  const cancelAtPeriodEnd = Boolean(sub?.cancelAtPeriodEnd);
  const manageable = Boolean(sub?.stripeCustomerId) && !sub?.grandfathered;
  const base = { trialEndsAt, currentPeriodEnd, cancelAtPeriodEnd };

  // Comped Pro forever.
  if (sub?.grandfathered) {
    return { tier: "pro", feeBps: PRO_FEE_BPS, trialing: false, status: sub.status, grandfathered: true, manageable: false, ...base };
  }

  // Inside a live trial → full Pro.
  const trialing = sub?.status === "trialing" && !!trialEndsAt && trialEndsAt.getTime() > now.getTime();
  if (trialing) {
    return { tier: "pro", feeBps: PRO_FEE_BPS, trialing: true, status: sub!.status, grandfathered: false, manageable, ...base };
  }

  // Active paid subscription → its plan.
  if (sub?.status === "active") {
    const tier: Tier = sub.plan === "pro" ? "pro" : "basic";
    return { tier, feeBps: tier === "pro" ? PRO_FEE_BPS : BASIC_FEE_BPS, trialing: false, status: sub.status, grandfathered: false, manageable, ...base };
  }

  // Everything else — lapsed trial, past_due, canceled, incomplete, no row → Basic terms (the nag state).
  return { tier: "basic", feeBps: BASIC_FEE_BPS, trialing: false, status: sub?.status ?? "none", grandfathered: false, manageable, ...base };
}

/** Effective plan for a store (or any object carrying the owner's userId). Cached per request. */
export async function resolvePlan(store: { userId: string }): Promise<EffectivePlan> {
  const sub = await getSubscription(store.userId);
  return resolveEffectivePlan(sub);
}

/** Cheap tier check for gating. */
export async function planTier(store: { userId: string }): Promise<Tier> {
  return (await resolvePlan(store)).tier;
}

/** Server-component guard: bounce Basic stores to the billing page with the feature they hit. */
export async function requirePlan(store: { userId: string }, tier: Tier): Promise<EffectivePlan> {
  const plan = await resolvePlan(store);
  if (tier === "pro" && plan.tier !== "pro") redirect("/app/billing?upgrade=feature");
  return plan;
}

// ---------- Stripe price resolution (by lookup_key, cached) ----------

let priceCache: Map<string, string> | null = null;

/** Map every known lookup_key → Stripe price id, one round-trip, cached process-wide. */
export async function loadPriceMap(force = false): Promise<Map<string, string>> {
  if (priceCache && !force) return priceCache;
  const stripe = getStripe();
  const res = await stripe.prices.list({ lookup_keys: Object.values(LOOKUP_KEYS), active: true, limit: 100 });
  const map = new Map<string, string>();
  for (const price of res.data) if (price.lookup_key) map.set(price.lookup_key, price.id);
  priceCache = map;
  return map;
}

/** Test hook: drop the cached price map. */
export function resetPriceCache() {
  priceCache = null;
}

export async function priceIdForLookupKey(lookupKey: LookupKey): Promise<string> {
  const map = await loadPriceMap();
  const id = map.get(lookupKey);
  if (!id) throw new Error(`No Stripe price with lookup_key "${lookupKey}". Run scripts/setup-billing.ts against this Stripe mode.`);
  return id;
}

// ---------- Customer + checkout + portal (platform account) ----------

/** Ensure the user's subscription row exists; returns it. */
async function ensureRow(userId: string): Promise<Subscription> {
  const existing = await db.query.subscriptions.findFirst({ where: eq(subscriptions.userId, userId) });
  if (existing) return existing;
  const [row] = await db
    .insert(subscriptions)
    .values({ id: newId("sub"), userId, plan: "basic", interval: "month", status: "canceled" })
    .onConflictDoNothing({ target: subscriptions.userId })
    .returning();
  return row ?? (await db.query.subscriptions.findFirst({ where: eq(subscriptions.userId, userId) }))!;
}

/** Stripe Customer on the *platform* account; stored on the subscription row. */
export async function getOrCreateCustomer(user: Pick<User, "id" | "email" | "name">): Promise<string> {
  const row = await ensureRow(user.id);
  if (row.stripeCustomerId) return row.stripeCustomerId;
  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name ?? undefined,
    metadata: { userId: user.id },
  });
  await db.update(subscriptions).set({ stripeCustomerId: customer.id }).where(eq(subscriptions.userId, user.id));
  return customer.id;
}

export type BillingCheckoutInput = { user: Pick<User, "id" | "email" | "name">; lookupKey: LookupKey; returnUrl: string };

/**
 * Stripe Checkout Session (mode: subscription) on the platform account. If the
 * user is still inside their app trial and has never had a real Stripe
 * subscription, the remaining trial rides along as `trial_end` so their card
 * isn't charged early; a used trial gets none.
 */
export async function createBillingCheckout({ user, lookupKey, returnUrl }: BillingCheckoutInput): Promise<string> {
  const row = await ensureRow(user.id);
  if (row.grandfathered) throw new Error("Grandfathered accounts don't need to subscribe.");
  const [customer, price] = await Promise.all([getOrCreateCustomer(user), priceIdForLookupKey(lookupKey)]);

  const now = Date.now();
  const trialUnused = !row.stripeSubscriptionId && !!row.trialEndsAt && row.trialEndsAt.getTime() > now;
  const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {
    metadata: { userId: user.id },
    ...(trialUnused ? { trial_end: Math.floor(row.trialEndsAt!.getTime() / 1000) } : {}),
  };

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer,
    line_items: [{ price, quantity: 1 }],
    client_reference_id: user.id,
    metadata: { userId: user.id, lookupKey },
    subscription_data: subscriptionData,
    success_url: `${returnUrl}?billing=success`,
    cancel_url: `${returnUrl}?billing=cancel`,
    allow_promotion_codes: true,
  });
  if (!session.url) throw new Error("Stripe checkout session has no url");
  return session.url;
}

/** Stripe Billing Customer Portal — card, cancel, switch plan. */
export async function createPortalSession(user: Pick<User, "id" | "email" | "name">, returnUrl: string): Promise<string> {
  const customer = await getOrCreateCustomer(user);
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({ customer, return_url: returnUrl });
  return session.url;
}

export { billingConfigured };
