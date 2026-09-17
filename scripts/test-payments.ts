/**
 * Payments smoke test — no Stripe keys, no HTTP. Runs the real checkout +
 * webhook code against the local Postgres with a fake Stripe client injected
 * through `setStripeClient()`.
 *
 *   STRIPE_SECRET_KEY=sk_test_fake STRIPE_CONNECT_CLIENT_ID=ca_fake \
 *   pnpm exec tsx --tsconfig scripts/tsconfig.test.json scripts/test-payments.ts
 *
 * (scripts/tsconfig.test.json maps `server-only` to an empty shim so the lib
 * code loads outside Next. Creates and removes its own user/store/product rows.)
 */
import assert from "node:assert/strict";
import { and, eq } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "../src/db";
import { entitlements, events, orders, paymentAccounts, products, stores, users } from "../src/db/schema";
import { newId } from "../src/lib/ids";
import { readOutbox } from "../src/lib/mailer";
import { startPaidCheckout, storeCanTakePayments } from "../src/lib/payments/checkout";
import { signConnectState, verifyConnectState } from "../src/lib/payments/connect-state";
import { connectUrl, platformFeeCents, refundOrder, setStripeClient } from "../src/lib/payments/stripe";
import { handleStripeEvent } from "../src/lib/payments/webhook";

// ---------- fake Stripe ----------
type Call = { method: string; params: unknown; opts?: unknown };
const calls: Call[] = [];
let failNextCreate = false;
const sessions = new Map<string, Stripe.Checkout.Session>();

function fakeSession(id: string, params: Stripe.Checkout.SessionCreateParams): Stripe.Checkout.Session {
  return {
    id,
    object: "checkout.session",
    url: `https://checkout.stripe.com/c/pay/${id}`,
    payment_status: "unpaid",
    payment_intent: `pi_${id.slice(3)}`,
    client_reference_id: params.client_reference_id ?? null,
    metadata: (params.metadata ?? null) as Stripe.Metadata | null,
    amount_total: params.line_items?.[0]?.price_data?.unit_amount ?? null,
    currency: params.line_items?.[0]?.price_data?.currency ?? null,
    livemode: false,
  } as unknown as Stripe.Checkout.Session;
}

const fakeStripe = {
  checkout: {
    sessions: {
      async create(params: Stripe.Checkout.SessionCreateParams, opts?: Stripe.RequestOptions) {
        calls.push({ method: "checkout.sessions.create", params, opts });
        if (failNextCreate) {
          failNextCreate = false;
          throw new Error("simulated Stripe outage");
        }
        const s = fakeSession(`cs_${newId("t")}`, params);
        sessions.set(s.id, s);
        return s;
      },
      async retrieve(id: string, _params: unknown, opts?: Stripe.RequestOptions) {
        calls.push({ method: "checkout.sessions.retrieve", params: id, opts });
        const s = sessions.get(id);
        if (!s) throw new Error(`No such checkout session: ${id}`);
        return s;
      },
      async list(params: { payment_intent?: string }, opts?: Stripe.RequestOptions) {
        calls.push({ method: "checkout.sessions.list", params, opts });
        return { data: [...sessions.values()].filter((s) => s.payment_intent === params.payment_intent) };
      },
    },
  },
  refunds: {
    async create(params: Stripe.RefundCreateParams, opts?: Stripe.RequestOptions) {
      calls.push({ method: "refunds.create", params, opts });
      const s = [...sessions.values()].find((x) => x.payment_intent === params.payment_intent);
      return { id: `re_${newId("t")}`, amount: params.amount ?? s?.amount_total ?? 0 };
    },
  },
  accounts: {
    async retrieve(id: string) {
      calls.push({ method: "accounts.retrieve", params: id });
      return { id, charges_enabled: true, details_submitted: true, email: "creator@example.com" };
    },
  },
  oauth: {
    async token(params: unknown) {
      calls.push({ method: "oauth.token", params });
      return { stripe_user_id: "acct_fake123", livemode: false, scope: "read_write" };
    },
    async deauthorize(params: unknown) {
      calls.push({ method: "oauth.deauthorize", params });
      return { stripe_user_id: "acct_fake123" };
    },
  },
} as unknown as Stripe;

setStripeClient(fakeStripe);

const last = (method: string) => [...calls].reverse().find((c) => c.method === method);
const event = <T>(type: string, object: T, account: string | null = ACCT): Stripe.Event =>
  ({ id: `evt_${newId("t")}`, type, account: account ?? undefined, data: { object }, livemode: false } as unknown as Stripe.Event);

// ---------- fixtures ----------
const ACCT = "acct_test_packaged";
const uid = newId("usr");
const sid = newId("sto");
const pid = newId("prd");
const username = `dtest${Date.now().toString(36)}`;

async function setup() {
  await db.insert(users).values({ id: uid, auth0Sub: `dev|${uid}`, email: `${uid}@example.com`, name: "Test Creator" });
  await db.insert(stores).values({ id: sid, userId: uid, username, displayName: "Test Store", theme: {} as never });
  await db.insert(products).values({ id: pid, storeId: sid, slug: "guide", title: "Growth Guide", priceCents: 1900, status: "published" });
}
async function teardown() {
  await db.delete(users).where(eq(users.id, uid)); // cascades store → products/orders/entitlements/events/payment_accounts
}
async function newOrder(amount = 1900) {
  const id = newId("ord");
  await db.insert(orders).values({
    id,
    storeId: sid,
    productId: pid,
    buyerEmail: `buyer-${id.slice(-4)}@example.com`,
    buyerName: "Pat Buyer",
    amountCents: amount,
    currency: "usd",
    provider: "stripe",
    status: "pending",
    marketingOptIn: true,
    source: { src: "ig" },
  });
  return id;
}
const order = (id: string) => db.query.orders.findFirst({ where: eq(orders.id, id) });
const ents = (id: string) => db.select().from(entitlements).where(eq(entitlements.orderId, id));
const checkoutInput = (orderId: string, platformFeeBps = 0) => ({
  orderId,
  storeId: sid,
  productId: pid,
  amountCents: 1900,
  currency: "usd",
  buyerEmail: "pat@example.com",
  buyerName: "Pat Buyer",
  title: "Growth Guide",
  successUrl: `http://localhost:3004/${username}/guide/thanks?o=${orderId}`,
  cancelUrl: `http://localhost:3004/${username}/guide`,
  platformFeeBps,
});

let passed = 0;
async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (e) {
    console.error(`  FAIL ${name}`);
    throw e;
  }
}

// ---------- tests ----------
async function main() {
  await setup();
  try {
    await test("connect state round-trips and rejects tampering", async () => {
      const state = await signConnectState(sid);
      assert.deepEqual(await verifyConnectState(state), { storeId: sid });
      assert.equal(await verifyConnectState(state.slice(0, -2) + "xx"), null);
      assert.equal(await verifyConnectState("garbage"), null);
    });

    await test("connectUrl carries client_id, state and callback redirect", async () => {
      const u = new URL(connectUrl(sid, "STATE123"));
      assert.equal(u.origin + u.pathname, "https://connect.stripe.com/oauth/authorize");
      assert.equal(u.searchParams.get("client_id"), "ca_fake");
      assert.equal(u.searchParams.get("state"), "STATE123");
      assert.equal(u.searchParams.get("scope"), "read_write");
      assert.equal(u.searchParams.get("response_type"), "code");
      assert.ok(u.searchParams.get("redirect_uri")?.endsWith("/api/payments/stripe/callback"));
    });

    await test("platform fee math", async () => {
      assert.equal(platformFeeCents(1900, 0), 0);
      assert.equal(platformFeeCents(1900, 500), 95);
      assert.equal(platformFeeCents(999, 1000), 100);
    });

    await test("storeCanTakePayments is false until an enabled Stripe account exists", async () => {
      assert.equal(await storeCanTakePayments(sid), false);
      const o = await newOrder();
      const r = await startPaidCheckout(checkoutInput(o));
      assert.equal(r.ok, false);
      assert.equal((await order(o))?.status, "failed");

      await db.insert(paymentAccounts).values({ id: newId("pay"), storeId: sid, provider: "stripe", externalId: ACCT, chargesEnabled: false, details: {} });
      assert.equal(await storeCanTakePayments(sid), false);
      await db.update(paymentAccounts).set({ chargesEnabled: true }).where(and(eq(paymentAccounts.storeId, sid), eq(paymentAccounts.provider, "stripe")));
      assert.equal(await storeCanTakePayments(sid), true);
    });

    let paidOrder = "";
    await test("startPaidCheckout creates a session on the connected account and stores providerRef", async () => {
      paidOrder = await newOrder();
      const r = await startPaidCheckout(checkoutInput(paidOrder));
      assert.ok(r.ok, "checkout should succeed");
      if (!r.ok) return;
      assert.equal(r.session.provider, "stripe");
      assert.match(r.session.redirectUrl, /^https:\/\/checkout\.stripe\.com\//);
      const c = last("checkout.sessions.create")!;
      const p = c.params as Stripe.Checkout.SessionCreateParams;
      assert.deepEqual(c.opts, { stripeAccount: ACCT });
      assert.equal(p.mode, "payment");
      assert.equal(p.client_reference_id, paidOrder);
      assert.equal(p.customer_email, "pat@example.com");
      assert.equal(p.line_items?.[0]?.price_data?.unit_amount, 1900);
      assert.equal(p.line_items?.[0]?.price_data?.product_data?.name, "Growth Guide");
      assert.equal(p.metadata?.orderId, paidOrder);
      assert.equal(p.payment_intent_data?.metadata?.orderId, paidOrder);
      assert.equal(p.payment_intent_data?.application_fee_amount, undefined, "no app fee at 0 bps");
      assert.equal(p.allow_promotion_codes, false);
      const o = await order(paidOrder);
      assert.equal(o?.provider, "stripe");
      assert.equal(o?.providerRef, r.session.providerRef);
      assert.equal(o?.platformFeeCents, 0);
      assert.equal(o?.status, "pending");
    });

    await test("application_fee_amount is set when platform_fee_bps > 0", async () => {
      const o = await newOrder();
      const r = await startPaidCheckout(checkoutInput(o, 500));
      assert.ok(r.ok);
      const p = last("checkout.sessions.create")!.params as Stripe.Checkout.SessionCreateParams;
      assert.equal(p.payment_intent_data?.application_fee_amount, 95);
      assert.equal(p.metadata?.platformFeeCents, "95");
      assert.equal((await order(o))?.platformFeeCents, 95);
    });

    await test("startPaidCheckout degrades gracefully when Stripe throws", async () => {
      const o = await newOrder();
      failNextCreate = true;
      const r = await startPaidCheckout(checkoutInput(o));
      assert.equal(r.ok, false);
      if (!r.ok) assert.match(r.error, /couldn't start checkout/);
      assert.equal((await order(o))?.status, "failed");
    });

    await test("webhook ignores an unpaid checkout.session.completed", async () => {
      const o = await order(paidOrder);
      const s = sessions.get(o!.providerRef!)!;
      const r = await handleStripeEvent(event("checkout.session.completed", { ...s, payment_status: "unpaid" }));
      assert.equal(r.handled, false);
      assert.equal((await order(paidOrder))?.status, "pending");
    });

    await test("webhook ignores events from a different connected account", async () => {
      const o = await order(paidOrder);
      const s = sessions.get(o!.providerRef!)!;
      const r = await handleStripeEvent(event("checkout.session.completed", { ...s, payment_status: "paid" }, "acct_someone_else"));
      assert.equal(r.handled, false);
      assert.match(r.reason ?? "", /does not match/);
      assert.equal((await order(paidOrder))?.status, "pending");
      assert.equal((await ents(paidOrder)).length, 0);
    });

    await test("checkout.session.completed marks paid, creates entitlement, emails, tracks purchase", async () => {
      const o = await order(paidOrder);
      const s = sessions.get(o!.providerRef!)!;
      const before = (await readOutbox(5)).length;
      const r = await handleStripeEvent(event("checkout.session.completed", { ...s, payment_status: "paid" }));
      assert.equal(r.handled, true);
      assert.equal(r.action, "paid");
      const after = await order(paidOrder);
      assert.equal(after?.status, "paid");
      assert.equal(after?.amountCents, 1900);
      const e = await ents(paidOrder);
      assert.equal(e.length, 1);
      assert.equal(e[0].revoked, false);
      assert.ok(e[0].token.length >= 32);
      const mails = await readOutbox(5);
      assert.ok(mails.length >= Math.min(before + 1, 5));
      assert.equal(mails[0].to, after?.buyerEmail);
      assert.match(mails[0].subject, /Growth Guide/);
      assert.ok(mails[0].html.includes(`/${username}/guide/thanks?e=${e[0].token}`));
      const purchases = await db.select().from(events).where(and(eq(events.storeId, sid), eq(events.type, "purchase")));
      assert.equal(purchases.length, 1);
      assert.deepEqual(purchases[0].source, { src: "ig" });
    });

    await test("duplicate delivery is idempotent", async () => {
      const o = await order(paidOrder);
      const s = sessions.get(o!.providerRef!)!;
      const r = await handleStripeEvent(event("checkout.session.completed", { ...s, payment_status: "paid" }));
      assert.equal(r.action, "already_paid");
      assert.equal((await ents(paidOrder)).length, 1);
      const purchases = await db.select().from(events).where(and(eq(events.storeId, sid), eq(events.type, "purchase")));
      assert.equal(purchases.length, 1);
    });

    await test("partial charge.refunded is ignored", async () => {
      const r = await handleStripeEvent(
        event("charge.refunded", { id: "ch_1", amount: 1900, amount_refunded: 500, refunded: false, metadata: { orderId: paidOrder }, payment_intent: null }),
      );
      assert.equal(r.handled, false);
      assert.equal((await order(paidOrder))?.status, "paid");
    });

    await test("full charge.refunded (via metadata) marks refunded and revokes entitlement", async () => {
      const r = await handleStripeEvent(
        event("charge.refunded", { id: "ch_1", amount: 1900, amount_refunded: 1900, refunded: true, metadata: { orderId: paidOrder }, payment_intent: null }),
      );
      assert.equal(r.handled, true);
      assert.equal(r.action, "refunded");
      assert.equal((await order(paidOrder))?.status, "refunded");
      assert.equal((await ents(paidOrder))[0].revoked, true);
      const again = await handleStripeEvent(
        event("charge.refunded", { id: "ch_1", amount: 1900, amount_refunded: 1900, refunded: true, metadata: { orderId: paidOrder }, payment_intent: null }),
      );
      assert.equal(again.action, "already_refunded");
    });

    await test("charge.refunded without metadata resolves the order via PaymentIntent → session lookup", async () => {
      const o = await newOrder();
      const r = await startPaidCheckout(checkoutInput(o));
      assert.ok(r.ok);
      if (!r.ok) return;
      const s = sessions.get(r.session.providerRef)!;
      await handleStripeEvent(event("checkout.session.completed", { ...s, payment_status: "paid" }));
      assert.equal((await order(o))?.status, "paid");
      const res = await handleStripeEvent(
        event("charge.refunded", { id: "ch_2", amount: 1900, amount_refunded: 1900, refunded: true, metadata: {}, payment_intent: s.payment_intent }),
      );
      assert.equal(res.action, "refunded");
      assert.deepEqual(last("checkout.sessions.list")!.opts, { stripeAccount: ACCT });
      assert.equal((await order(o))?.status, "refunded");
    });

    await test("refundOrder refunds the session's PaymentIntent on the connected account", async () => {
      const o = await newOrder();
      const r = await startPaidCheckout(checkoutInput(o));
      assert.ok(r.ok);
      if (!r.ok) return;
      const row = (await order(o))!;
      const res = await refundOrder(row, ACCT);
      assert.match(res.refundId, /^re_/);
      assert.equal(res.amountCents, 1900);
      const c = last("refunds.create")!;
      assert.equal((c.params as Stripe.RefundCreateParams).payment_intent, sessions.get(row.providerRef!)!.payment_intent);
      assert.equal((c.params as Stripe.RefundCreateParams).refund_application_fee, undefined);
      assert.deepEqual(c.opts, { stripeAccount: ACCT, idempotencyKey: `refund_${o}` });
    });

    await test("account.updated + account.application.deauthorized maintain payment_accounts", async () => {
      let r = await handleStripeEvent(event("account.updated", { id: ACCT, charges_enabled: false, details_submitted: true, payouts_enabled: false, email: "x@y.z" }));
      assert.equal(r.action, "account_updated");
      const acct = await db.query.paymentAccounts.findFirst({ where: eq(paymentAccounts.externalId, ACCT) });
      assert.equal(acct?.chargesEnabled, false);
      assert.equal(acct?.details.email, "x@y.z");
      assert.equal(await storeCanTakePayments(sid), false);
      r = await handleStripeEvent(event("account.application.deauthorized", { id: "ca_fake", object: "application" }));
      assert.equal(r.action, "disconnected");
      assert.equal(await db.query.paymentAccounts.findFirst({ where: eq(paymentAccounts.externalId, ACCT) }), undefined);
    });

    await test("unknown event types are ignored with a 200-style result", async () => {
      const r = await handleStripeEvent(event("payment_intent.created", { id: "pi_x" }));
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
