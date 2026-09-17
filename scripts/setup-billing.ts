/**
 * Idempotently create our two subscription Products (Basic, Pro) and four
 * Prices (basic/pro × monthly/yearly) on the PLATFORM Stripe account, keyed by
 * `lookup_key` so the app never hardcodes price ids. Run once per Stripe mode:
 *
 *   STRIPE_SECRET_KEY=sk_test_... pnpm exec tsx --tsconfig scripts/tsconfig.test.json scripts/setup-billing.ts
 *   STRIPE_SECRET_KEY=sk_live_... pnpm exec tsx --tsconfig scripts/tsconfig.test.json scripts/setup-billing.ts
 *
 * Safe to re-run: existing products/prices are reused; a price is only created
 * when none with that lookup_key + amount exists (the lookup_key transfers to
 * the new price if you change an amount).
 */
import Stripe from "stripe";
import { LOOKUP_KEYS, PLAN_PRICES, type LookupKey, type Tier } from "../src/lib/billing";

const key = (process.env.STRIPE_SECRET_KEY ?? "").trim().replace(/^STRIPE_SECRET_KEY=/, "").replace(/^["']|["']$/g, "");
if (!key) {
  console.error("Set STRIPE_SECRET_KEY (test or live) in the environment before running.");
  process.exit(1);
}
const stripe = new Stripe(key, { appInfo: { name: "visitmy.shop setup-billing" } });

const PLAN_META: Record<Tier, { name: string; description: string }> = {
  basic: { name: "visitmy.shop Basic", description: "Sell digital products with a 5% transaction fee." },
  pro: { name: "visitmy.shop Pro", description: "Everything in Basic with 0% transaction fee, design editor, Instagram auto-replies and more." },
};

async function findOrCreateProduct(tier: Tier): Promise<string> {
  // Products carry no lookup_key, so we tag them and search by metadata.
  const search = await stripe.products.search({ query: `active:'true' AND metadata['planKey']:'${tier}'`, limit: 1 });
  if (search.data[0]) {
    console.log(`  product ${tier}: reuse ${search.data[0].id}`);
    return search.data[0].id;
  }
  const product = await stripe.products.create({ name: PLAN_META[tier].name, description: PLAN_META[tier].description, metadata: { app: "visitmy.shop", planKey: tier } });
  console.log(`  product ${tier}: created ${product.id}`);
  return product.id;
}

async function findOrCreatePrice(productId: string, lookupKey: LookupKey): Promise<string> {
  const { plan, interval, amountCents } = PLAN_PRICES[lookupKey];
  const existing = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  const hit = existing.data[0];
  if (hit && hit.unit_amount === amountCents && hit.recurring?.interval === interval) {
    console.log(`  price  ${lookupKey}: reuse ${hit.id} (${amountCents / 100} USD/${interval})`);
    return hit.id;
  }
  const price = await stripe.prices.create({
    product: productId,
    currency: "usd",
    unit_amount: amountCents,
    recurring: { interval },
    lookup_key: lookupKey,
    transfer_lookup_key: true, // move the key off any older price with a different amount
    nickname: `${plan} ${interval}ly`,
  });
  console.log(`  price  ${lookupKey}: created ${price.id} (${amountCents / 100} USD/${interval})`);
  return price.id;
}

async function main() {
  console.log(`Setting up billing on Stripe (${key.startsWith("sk_live") ? "LIVE" : "TEST"} mode)…`);
  const products: Record<Tier, string> = { basic: await findOrCreateProduct("basic"), pro: await findOrCreateProduct("pro") };
  const results: Record<string, string> = {};
  for (const lookupKey of Object.values(LOOKUP_KEYS)) {
    const tier = PLAN_PRICES[lookupKey].plan;
    results[lookupKey] = await findOrCreatePrice(products[tier], lookupKey);
  }
  console.log("\nDone. Prices by lookup_key:");
  for (const [lk, id] of Object.entries(results)) console.log(`  ${lk.padEnd(14)} → ${id}`);
  console.log("\nThe app resolves these by lookup_key at runtime — no ids to paste anywhere.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
