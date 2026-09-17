/**
 * Billing smoke test — no Stripe keys, no HTTP. Exercises the real billing
 * resolver, checkout/fee wiring and the subscription webhook handler against
 * local Postgres with a fake Stripe injected via `setStripeClient()`.
 *
 *   STRIPE_SECRET_KEY=sk_test_fake STRIPE_CONNECT_CLIENT_ID=ca_fake \
 *   pnpm exec tsx --tsconfig scripts/tsconfig.test.json scripts/test-billing.ts
 *
 * Creates and removes its own user/store/subscription rows.
 */
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "../src/db";
import { orders, paymentAccounts, products, stores, subscriptions, users, type Subscription } from "../src/db/schema";
import {
  BASIC_FEE_BPS,
  PRO_FEE_BPS,
  TRIAL_DAYS,
  createBillingCheckout,
  createPortalSession,
  getOrCreateCustomer,
  resetPriceCache,
  resolveEffectivePlan,
} from "../src/lib/billing";
import { handleBillingEvent } from "../src/lib/billing-webhook";
import { newId } from "../src/lib/ids";
import { startPaidCheckout } from "../src/lib/payments/checkout";
import { setStripeClient } from "../src/lib/payments/stripe";

// ---------- fake Stripe ----------
type Call = { method: string; params: unknown; opts?: unknown };
const calls: Call[] = [];
let nextRetrievedSub: Stripe.Subscription | null = null;

const PRICE_IDS: Record<string, string> = { basic_monthly: "price_bm", basic_yearly: "price_by", pro_monthly: "price_pm", pro_yearly: "price_py" };

const fakeStripe = {
  customers: {
    async create(params: Stripe.CustomerCreateParams) {
      calls.push({ method: "customers.create", params });
      return { id: `cus_${newId("t").slice(2)}`, object: "customer" };
    },
  },
  prices: {
    async list(params: Stripe.PriceListParams) {
      calls.push({ method: "prices.list", params });
      const keys = (params.lookup_keys ?? []) as string[];
      const data = keys.filter((k) => PRICE_IDS[k]).map((k) => ({ id: PRICE_IDS[k], lookup_key: k, active: true }));
      return { data };
    },
  },
  checkout: {
    sessions: {
      async create(params: Stripe.Checkout.SessionCreateParams) {
        calls.push({ method: "checkout.sessions.create", params });
        return { id: `cs_${newId("t").slice(2)}`, url: "https://checkout.stripe.com/c/pay/billing", object: "checkout.session" };
      },
    },
  },
  billingPortal: {
    sessions: {
      async create(params: Stripe.BillingPortal.SessionCreateParams) {
        calls.push({ method: "billingPortal.sessions.create", params });
        return { id: `bps_${newId("t").slice(2)}`, url: "https://billing.stripe.com/p/session/test", object: "billing_portal.session" };
      },
    },
  },
  subscriptions: {
    async retrieve(id: string, _opts?: unknown) {
      calls.push({ method: "subscriptions.retrieve", params: id });
      if (!nextRetrievedSub) throw new Error("no fake subscription queued");
      return nextRetrievedSub;
    },
  },
} as unknown as Stripe;

setStripeClient(fakeStripe);
const last = (method: string) => [...calls].reverse().find((c) => c.method === method);

// A Stripe.Subscription with one item carrying a price + lookup_key.
function fakeSub(over: { id?: string; status?: string; lookupKey?: string; interval?: "month" | "year"; userId?: string; customer?: string; cancelAtPeriodEnd?: boolean; periodEnd?: number; trialEnd?: number }): Stripe.Subscription {
  return {
    id: over.id ?? "sub_fake",
    object: "subscription",
    status: over.status ?? "active",
    customer: over.customer ?? "cus_fake",
    cancel_at_period_end: over.cancelAtPeriodEnd ?? false,
    current_period_end: over.periodEnd ?? Math.floor(Date.now() / 1000) + 30 * 86400,
    trial_end: over.trialEnd ?? null,
    metadata: over.userId ? { userId: over.userId } : {},
    items: { data: [{ price: { id: "price_x", lookup_key: over.lookupKey ?? "pro_monthly", recurring: { interval: over.interval ?? "month" } } }] },
  } as unknown as Stripe.Subscription;
}

const billingEvent = <T>(type: string, object: T): Stripe.Event => ({ id: `evt_${newId("t")}`, type, data: { object }, livemode: false } as unknown as Stripe.Event);

// ---------- fixtures ----------
const uid = newId("usr");
const sid = newId("sto");
const pid = newId("prd");
const username = `btest${Date.now().toString(36)}`;
const ACCT = "acct_billing_test";

const baseSub = (over: Partial<Subscription> = {}): Subscription =>
  ({
    id: "sub_row",
    userId: uid,
    plan: "basic",
    interval: "month",
    status: "active",
    provider: null,
    externalId: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    stripePriceLookupKey: null,
    cancelAtPeriodEnd: false,
    trialEndsAt: null,
    grandfathered: false,
    currentPeriodEnd: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  }) as Subscription;

const future = () => new Date(Date.now() + 7 * 86400_000);
const past = () => new Date(Date.now() - 86400_000);

async function setup() {
  await db.insert(users).values({ id: uid, auth0Sub: `dev|${uid}`, email: `${uid}@example.com`, name: "Bill Tester" });
  await db.insert(stores).values({ id: sid, userId: uid, username, displayName: "Bill Store", theme: {} as never });
  await db.insert(products).values({ id: pid, storeId: sid, slug: "guide", title: "Guide", priceCents: 2000, status: "published" });
  await db.insert(paymentAccounts).values({ id: newId("pay"), storeId: sid, provider: "stripe", externalId: ACCT, chargesEnabled: true, details: {} });
}
async function teardown() {
  await db.delete(users).where(eq(users.id, uid)); // cascades store/products/orders/subscription/payment_accounts
}
async function upsertSub(over: Partial<typeof subscriptions.$inferInsert>) {
  await db.delete(subscriptions).where(eq(subscriptions.userId, uid));
  await db.insert(subscriptions).values({ id: newId("sub"), userId: uid, plan: "basic", interval: "month", status: "active", ...over });
}
const subRow = () => db.query.subscriptions.findFirst({ where: eq(subscriptions.userId, uid) });
async function newOrder(amount = 2000) {
  const id = newId("ord");
  await db.insert(orders).values({ id, storeId: sid, productId: pid, buyerEmail: `b-${id.slice(-4)}@e.com`, buyerName: "Buyer", amountCents: amount, currency: "usd", provider: "stripe", status: "pending" });
  return id;
}

let passed = 0;
async function test(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (e) {
    console.error(`  FAIL ${name}`);
    throw e;
  }
}

async function main() {
  await setup();
  try {
    // ---------- resolveEffectivePlan (pure) ----------
    await test("trial active → Pro, 0% fee, trialing", () => {
      const p = resolveEffectivePlan(baseSub({ plan: "pro", status: "trialing", trialEndsAt: future() }));
      assert.equal(p.tier, "pro");
      assert.equal(p.feeBps, PRO_FEE_BPS);
      assert.equal(p.trialing, true);
    });
    await test("trial lapsed → Basic, 5% fee, nag", () => {
      const p = resolveEffectivePlan(baseSub({ plan: "pro", status: "trialing", trialEndsAt: past() }));
      assert.equal(p.tier, "basic");
      assert.equal(p.feeBps, BASIC_FEE_BPS);
      assert.equal(p.trialing, false);
    });
    await test("active Basic → Basic, 5% fee", () => {
      const p = resolveEffectivePlan(baseSub({ plan: "basic", status: "active" }));
      assert.equal(p.tier, "basic");
      assert.equal(p.feeBps, BASIC_FEE_BPS);
    });
    await test("active Pro → Pro, 0% fee", () => {
      const p = resolveEffectivePlan(baseSub({ plan: "pro", status: "active" }));
      assert.equal(p.tier, "pro");
      assert.equal(p.feeBps, PRO_FEE_BPS);
    });
    await test("grandfathered → Pro, 0% fee, not manageable", () => {
      const p = resolveEffectivePlan(baseSub({ plan: "basic", status: "active", grandfathered: true, stripeCustomerId: "cus_x" }));
      assert.equal(p.tier, "pro");
      assert.equal(p.feeBps, PRO_FEE_BPS);
      assert.equal(p.manageable, false);
    });
    await test("canceled → Basic, 5% fee", () => {
      const p = resolveEffectivePlan(baseSub({ plan: "pro", status: "canceled" }));
      assert.equal(p.tier, "basic");
      assert.equal(p.feeBps, BASIC_FEE_BPS);
    });
    await test("no subscription row → Basic, status none", () => {
      const p = resolveEffectivePlan(null);
      assert.equal(p.tier, "basic");
      assert.equal(p.feeBps, BASIC_FEE_BPS);
      assert.equal(p.status, "none");
      assert.equal(p.manageable, false);
    });
    await test("manageable when a Stripe customer exists (non-grandfathered)", () => {
      assert.equal(resolveEffectivePlan(baseSub({ status: "active", stripeCustomerId: "cus_x" })).manageable, true);
      assert.equal(resolveEffectivePlan(baseSub({ status: "active", stripeCustomerId: null })).manageable, false);
    });

    // ---------- fee wiring into buyer checkout ----------
    await test("Basic seller → buyer checkout carries a 5% application fee", async () => {
      await upsertSub({ plan: "basic", status: "active" });
      const store = (await db.query.stores.findFirst({ where: eq(stores.id, sid) }))!;
      const feeBps = resolveEffectivePlan((await subRow())!).feeBps;
      assert.equal(feeBps, BASIC_FEE_BPS);
      const o = await newOrder(2000);
      const r = await startPaidCheckout({
        orderId: o,
        storeId: store.id,
        productId: pid,
        amountCents: 2000,
        currency: "usd",
        buyerEmail: "b@e.com",
        buyerName: "B",
        title: "Guide",
        successUrl: "http://x/thanks",
        cancelUrl: "http://x",
        platformFeeBps: feeBps,
      });
      assert.ok(r.ok);
      const p = last("checkout.sessions.create")!.params as Stripe.Checkout.SessionCreateParams;
      assert.equal(p.payment_intent_data?.application_fee_amount, 100); // 5% of 2000
      assert.equal((await db.query.orders.findFirst({ where: eq(orders.id, o) }))?.platformFeeCents, 100);
    });
    await test("Pro seller → buyer checkout has no application fee", async () => {
      await upsertSub({ plan: "pro", status: "active" });
      const feeBps = resolveEffectivePlan((await subRow())!).feeBps;
      assert.equal(feeBps, PRO_FEE_BPS);
      const o = await newOrder(2000);
      const r = await startPaidCheckout({
        orderId: o,
        storeId: sid,
        productId: pid,
        amountCents: 2000,
        currency: "usd",
        buyerEmail: "b@e.com",
        buyerName: "B",
        title: "Guide",
        successUrl: "http://x/thanks",
        cancelUrl: "http://x",
        platformFeeBps: feeBps,
      });
      assert.ok(r.ok);
      const p = last("checkout.sessions.create")!.params as Stripe.Checkout.SessionCreateParams;
      assert.equal(p.payment_intent_data?.application_fee_amount, undefined);
    });

    // ---------- customer + checkout + portal ----------
    await test("getOrCreateCustomer creates once and stores the id", async () => {
      await upsertSub({ plan: "pro", status: "trialing", trialEndsAt: future() });
      const user = (await db.query.users.findFirst({ where: eq(users.id, uid) }))!;
      const c1 = await getOrCreateCustomer(user);
      assert.match(c1, /^cus_/);
      assert.equal((await subRow())?.stripeCustomerId, c1);
      const c2 = await getOrCreateCustomer(user);
      assert.equal(c2, c1, "reuses the stored customer");
    });
    await test("createBillingCheckout gives a first-time subscriber a card-backed 7-day trial and resolves price by lookup_key", async () => {
      resetPriceCache();
      const user = (await db.query.users.findFirst({ where: eq(users.id, uid) }))!;
      const url = await createBillingCheckout({ user, lookupKey: "pro_monthly", returnUrl: "http://x/app/billing" });
      assert.match(url, /^https:\/\/checkout\.stripe\.com\//);
      const p = last("checkout.sessions.create")!.params as Stripe.Checkout.SessionCreateParams;
      assert.equal(p.mode, "subscription");
      assert.equal(p.line_items?.[0]?.price, "price_pm");
      assert.equal(p.client_reference_id, uid);
      assert.equal(p.subscription_data?.trial_period_days, TRIAL_DAYS, "starts a fresh trial");
      assert.equal(p.payment_method_collection, "always", "requires a card up front");
      assert.equal(p.subscription_data?.trial_settings?.end_behavior?.missing_payment_method, "cancel");
    });
    await test("createBillingCheckout gives no trial once the store has had a Stripe subscription", async () => {
      resetPriceCache();
      await upsertSub({ plan: "pro", status: "canceled", stripeSubscriptionId: "sub_old", stripeCustomerId: "cus_old" });
      const user = (await db.query.users.findFirst({ where: eq(users.id, uid) }))!;
      await createBillingCheckout({ user, lookupKey: "pro_monthly", returnUrl: "http://x/app/billing" });
      const p = last("checkout.sessions.create")!.params as Stripe.Checkout.SessionCreateParams;
      assert.equal(p.subscription_data?.trial_period_days, undefined, "no repeat trial");
      assert.equal(p.payment_method_collection, "always");
    });
    await test("createPortalSession opens the customer portal", async () => {
      const user = (await db.query.users.findFirst({ where: eq(users.id, uid) }))!;
      const url = await createPortalSession(user, "http://x/app/billing");
      assert.match(url, /^https:\/\/billing\.stripe\.com\//);
    });

    // ---------- billing webhook transitions ----------
    await test("checkout.session.completed → active Pro (plan from lookup_key)", async () => {
      await upsertSub({ plan: "pro", status: "trialing", trialEndsAt: future(), stripeCustomerId: "cus_web" });
      nextRetrievedSub = fakeSub({ id: "sub_web", status: "active", lookupKey: "pro_monthly", userId: uid, customer: "cus_web" });
      const r = await handleBillingEvent(billingEvent("checkout.session.completed", { mode: "subscription", subscription: "sub_web", customer: "cus_web", client_reference_id: uid, id: "cs_1", metadata: { userId: uid } }));
      assert.equal(r.action, "checkout_completed");
      const row = (await subRow())!;
      assert.equal(row.status, "active");
      assert.equal(row.plan, "pro");
      assert.equal(row.stripeSubscriptionId, "sub_web");
      assert.equal(row.stripePriceLookupKey, "pro_monthly");
      assert.equal(resolveEffectivePlan(row).tier, "pro");
    });
    await test("checkout.session.completed maps a yearly Basic price", async () => {
      await upsertSub({ plan: "pro", status: "trialing", trialEndsAt: future(), stripeCustomerId: "cus_web" });
      nextRetrievedSub = fakeSub({ id: "sub_b", status: "active", lookupKey: "basic_yearly", interval: "year", userId: uid, customer: "cus_web" });
      await handleBillingEvent(billingEvent("checkout.session.completed", { mode: "subscription", subscription: "sub_b", customer: "cus_web", client_reference_id: uid, id: "cs_2" }));
      const row = (await subRow())!;
      assert.equal(row.plan, "basic");
      assert.equal(row.interval, "year");
      assert.equal(resolveEffectivePlan(row).tier, "basic");
    });
    await test("customer.subscription.updated → past_due drops to Basic terms", async () => {
      await upsertSub({ plan: "pro", status: "active", stripeSubscriptionId: "sub_web", stripeCustomerId: "cus_web" });
      const r = await handleBillingEvent(billingEvent("customer.subscription.updated", fakeSub({ id: "sub_web", status: "past_due", lookupKey: "pro_monthly", userId: uid, customer: "cus_web" })));
      assert.equal(r.action, "subscription_updated");
      const row = (await subRow())!;
      assert.equal(row.status, "past_due");
      assert.equal(resolveEffectivePlan(row).tier, "basic");
      assert.equal(resolveEffectivePlan(row).feeBps, BASIC_FEE_BPS);
    });
    await test("invoice.payment_failed → past_due", async () => {
      await upsertSub({ plan: "pro", status: "active", stripeSubscriptionId: "sub_web", stripeCustomerId: "cus_web" });
      const r = await handleBillingEvent(billingEvent("invoice.payment_failed", { id: "in_1", subscription: "sub_web", customer: "cus_web" }));
      assert.equal(r.action, "payment_failed");
      assert.equal((await subRow())?.status, "past_due");
    });
    await test("customer.subscription.deleted → canceled → tier falls to Basic", async () => {
      await upsertSub({ plan: "pro", status: "active", stripeSubscriptionId: "sub_web", stripeCustomerId: "cus_web" });
      const r = await handleBillingEvent(billingEvent("customer.subscription.deleted", fakeSub({ id: "sub_web", status: "canceled", userId: uid, customer: "cus_web" })));
      assert.equal(r.action, "subscription_deleted");
      const row = (await subRow())!;
      assert.equal(row.status, "canceled");
      assert.equal(resolveEffectivePlan(row).tier, "basic");
    });
    await test("unknown billing events are ignored", async () => {
      const r = await handleBillingEvent(billingEvent("customer.updated", { id: "cus_web" }));
      assert.equal(r.handled, false);
      assert.equal(r.action, "ignored");
    });

    console.log(`\n${passed} tests passed`);
  } finally {
    await teardown();
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
