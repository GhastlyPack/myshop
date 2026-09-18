/**
 * One-off: the demo store's link product pointed at kit.co, which shut down. Repoint it at the
 * platform's Instagram and retitle it. Run against the target database:
 *
 *   DATABASE_URL="postgres://…" npx tsx --tsconfig scripts/tsconfig.test.json scripts/fix-demo-link.mts
 *
 * Then flush the cached storefront: POST /api/dev/revalidate?store=demo (needs REVALIDATE_SECRET in prod).
 */
import { db } from "../src/db";
import { productLinks, products } from "../src/db/schema";
import { eq } from "drizzle-orm";

await db.update(productLinks).set({ url: "https://www.instagram.com/visitmy.shop", label: "Open Instagram" }).where(eq(productLinks.id, "plk_demo_gear"));
await db
  .update(products)
  .set({ title: "Behind the scenes", subtitle: "Shoots, edits, and what I'm testing next, on Instagram.", slug: "behind-the-scenes", buttonText: "Follow along" })
  .where(eq(products.id, "prd_demo_link"));

const [p] = await db.select({ title: products.title, slug: products.slug }).from(products).where(eq(products.id, "prd_demo_link"));
const [l] = await db.select({ url: productLinks.url }).from(productLinks).where(eq(productLinks.id, "plk_demo_gear"));
console.log(p && l ? `demo link product is now "${p.title}" (/demo/${p.slug}) → ${l.url}` : "demo link product not found in this database");
process.exit(0);
