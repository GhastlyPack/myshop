/**
 * Dev seed for the growth layer (Package E): gives the signed-in admin's store a
 * few products, orders, reviews and a few hundred events spread over 30 days so
 * /app/analytics, /app/reviews and /admin have real shapes to render.
 *
 * Idempotent: every row uses a deterministic id prefixed `*_e` and is upserted.
 *   pnpm exec tsx scripts/seed-events.ts
 */
import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { db } from "../src/db";
import { events, orders, products, reviews, stores, users, type TrafficSource } from "../src/db/schema";

const EMAIL = (process.env.SEED_EMAIL ?? "16croemer.stem@gmail.com").toLowerCase();
const DAYS = 30;

const SOURCES: TrafficSource[] = [
  { src: "ig" },
  { src: "ig" },
  { src: "ig" },
  { utm_source: "tiktok", utm_medium: "bio" },
  { referrer: "instagram.com" },
  { referrer: "l.instagram.com" },
  { referrer: "t.co" },
  { referrer: "youtube.com" },
  { utm_source: "newsletter", utm_campaign: "sept" },
  {},
  {},
];

const PRODUCTS = [
  { id: "prd_e_guide", slug: "creator-launch-guide", title: "Creator Launch Guide", priceCents: 1900, dmKeyword: "LAUNCH" },
  { id: "prd_e_checklist", slug: "free-reel-checklist", title: "Free Reel Checklist", priceCents: 0, dmKeyword: "REEL" },
  { id: "prd_e_presets", slug: "lightroom-presets", title: "Lightroom Presets Pack", priceCents: 2900, dmKeyword: null },
  { id: "prd_e_template", slug: "notion-content-planner", title: "Notion Content Planner", priceCents: 900, dmKeyword: "PLAN" },
];

const NAMES = ["Ava", "Liam", "Mia", "Noah", "Zoe", "Ethan", "Isla", "Lucas", "Nora", "Leo"];
const QUOTES = [
  "Exactly what I needed to get my first launch out the door.",
  "Clear, short, and actually useful. Bought the presets next.",
  "The checklist alone saved me an hour a week.",
  null,
  "Great value for the price.",
  "Would love a video walkthrough, but the templates are solid.",
];

// Deterministic PRNG so the seed is reproducible.
let seed = 42;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

function at(daysAgo: number, hour = Math.floor(rand() * 24)) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(hour, Math.floor(rand() * 60), Math.floor(rand() * 60), 0);
  return d;
}

async function main() {
  const user = await db.query.users.findFirst({ where: eq(users.email, EMAIL) });
  if (!user) throw new Error(`No user with email ${EMAIL}. Sign in at /dev/login first.`);

  let store = await db.query.stores.findFirst({ where: eq(stores.userId, user.id) });
  if (!store) {
    [store] = await db
      .insert(stores)
      .values({ id: "sto_etest", userId: user.id, username: "etest", displayName: "E Test Store", theme: {} })
      .returning();
    console.log("created store", store.username);
  } else {
    console.log("using existing store", store.username, store.id);
  }
  const storeId = store.id;

  for (const [i, p] of PRODUCTS.entries()) {
    await db
      .insert(products)
      .values({ ...p, storeId, status: "published", position: i, description: `Seeded product: ${p.title}.` })
      .onConflictDoUpdate({ target: products.id, set: { title: p.title, priceCents: p.priceCents, dmKeyword: p.dmKeyword } });
  }

  // Wipe previously seeded rows for this store so re-runs don't double counts.
  await db.delete(events).where(sql`${events.storeId} = ${storeId} and ${events.id} like 'evt_e_%'`);
  await db.delete(reviews).where(sql`${reviews.id} like 'rev_e_%'`);
  await db.delete(orders).where(sql`${orders.storeId} = ${storeId} and ${orders.id} like 'ord_e_%'`);

  // Sessions: each session is a small funnel with drop-off at every step.
  const evRows: (typeof events.$inferInsert)[] = [];
  const ordRows: (typeof orders.$inferInsert)[] = [];
  const revRows: (typeof reviews.$inferInsert)[] = [];
  let n = 0;
  let o = 0;
  for (let day = DAYS - 1; day >= 0; day--) {
    // Traffic ramps a little toward today with a weekend dip.
    const dow = new Date(Date.now() - day * 864e5).getUTCDay();
    const base = 6 + Math.round((DAYS - day) / 4) + (dow === 0 || dow === 6 ? -3 : 0);
    const sessions = Math.max(2, base + Math.floor(rand() * 6));
    for (let s = 0; s < sessions; s++) {
      const sessionId = `sess_e_${day}_${s}`;
      const source = pick(SOURCES);
      const t = at(day);
      const push = (type: (typeof events.$inferInsert)["type"], productId: string | null, offsetSec: number) =>
        evRows.push({
          id: `evt_e_${n++}`,
          storeId,
          productId,
          type,
          sessionId,
          source,
          createdAt: new Date(t.getTime() + offsetSec * 1000),
        });

      push("view", null, 0);
      if (rand() < 0.62) {
        const product = pick(PRODUCTS);
        push("click", product.id, 8);
        push("product_view", product.id, 10);
        if (rand() < 0.45) {
          push("checkout_start", product.id, 40);
          const converts = product.priceCents === 0 ? rand() < 0.8 : rand() < 0.35;
          if (converts) {
            const paid = product.priceCents > 0;
            const orderId = `ord_e_${o++}`;
            const name = pick(NAMES);
            ordRows.push({
              id: orderId,
              storeId,
              productId: product.id,
              buyerEmail: `${name.toLowerCase()}${o}@example.com`,
              buyerName: name,
              marketingOptIn: rand() < 0.6,
              amountCents: product.priceCents,
              provider: paid ? "stripe" : "free",
              providerRef: paid ? `cs_test_e_${o}` : null,
              status: "paid",
              source,
              createdAt: new Date(t.getTime() + 90 * 1000),
            });
            push(paid ? "purchase" : "lead", product.id, 90);
            if (rand() < 0.85) push("download", product.id, 130);
            if (rand() < 0.35) {
              revRows.push({
                id: `rev_e_${orderId}`,
                productId: product.id,
                orderId,
                rating: 3 + Math.floor(rand() * 3),
                quote: pick(QUOTES),
                reviewerName: name,
                approved: rand() < 0.4,
                createdAt: new Date(t.getTime() + 3600 * 1000),
              });
            }
          }
        }
      }
    }
  }

  for (let i = 0; i < evRows.length; i += 200) await db.insert(events).values(evRows.slice(i, i + 200));
  if (ordRows.length) await db.insert(orders).values(ordRows);
  if (revRows.length) await db.insert(reviews).values(revRows);

  console.log(`seeded ${PRODUCTS.length} products, ${evRows.length} events, ${ordRows.length} orders, ${revRows.length} reviews for /${store.username}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
