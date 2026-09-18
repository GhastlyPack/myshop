import "server-only";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "@/db";
import { productFiles, productLinks, products, productVariants, reviews, sections, stores } from "@/db/schema";

/**
 * Shared read queries. Public storefront reads are cached by username tag so a
 * bio-link spike never hits Postgres; every dashboard mutation calls
 * revalidateStore(username).
 */
export const storeTag = (username: string) => `store:${username.toLowerCase()}`;

export function revalidateStore(username: string) {
  revalidateTag(storeTag(username), "max");
}

/**
 * Storefront rows. Deliberately uncached here: `getPublicStoreTagged` wraps it under the
 * username tag so `revalidateStore` actually refreshes it (a nested untagged cache would
 * keep serving stale rows, e.g. an old "sold out" state, for its whole TTL).
 */
export async function getPublicStore(usernameRaw: string) {
  const username = usernameRaw.toLowerCase();
  const store = await db.query.stores.findFirst({ where: and(eq(stores.username, username), eq(stores.published, true)) });
  if (!store) return null;
  const [secs, prods] = await Promise.all([
    db.select().from(sections).where(eq(sections.storeId, store.id)).orderBy(asc(sections.position)),
    db
      .select()
      .from(products)
      .where(and(eq(products.storeId, store.id), eq(products.status, "published"), eq(products.listed, true), isNull(products.deletedAt)))
      .orderBy(asc(products.position)),
  ]);
  // "From $X" for products with pricing tiers: the cheapest tier per product.
  const fromPrices: Record<string, number> = {};
  if (prods.length > 0) {
    const tiers = await db
      .select({ productId: productVariants.productId, priceCents: productVariants.priceCents })
      .from(productVariants)
      .where(inArray(productVariants.productId, prods.map((p) => p.id)));
    for (const t of tiers) fromPrices[t.productId] = Math.min(fromPrices[t.productId] ?? Number.POSITIVE_INFINITY, t.priceCents);
  }
  return { store, sections: secs, products: prods, fromPrices };
}

/**
 * Owner-only view of a store regardless of its published state, so the design editor can
 * preview a draft during onboarding. Uncached and scoped to the owner's userId, so it never
 * exposes anyone else's unpublished store.
 */
export async function getDraftStoreForOwner(usernameRaw: string, ownerUserId: string) {
  const username = usernameRaw.toLowerCase();
  const store = await db.query.stores.findFirst({ where: and(eq(stores.username, username), eq(stores.userId, ownerUserId)) });
  if (!store) return null;
  const [secs, prods] = await Promise.all([
    db.select().from(sections).where(eq(sections.storeId, store.id)).orderBy(asc(sections.position)),
    db
      .select()
      .from(products)
      .where(and(eq(products.storeId, store.id), eq(products.status, "published"), eq(products.listed, true), isNull(products.deletedAt)))
      .orderBy(asc(products.position)),
  ]);
  // Same shape as getPublicStore; a draft preview doesn't need "From $X" labels.
  return { store, sections: secs, products: prods, fromPrices: {} as Record<string, number> };
}

/** Cached under the username tag (used by the page so the tag attaches). */
export async function getPublicStoreTagged(username: string) {
  const fn = unstable_cache(() => getPublicStore(username), ["public-store", username.toLowerCase()], {
    tags: [storeTag(username)],
    revalidate: 300,
  });
  return fn();
}

export async function getPublicProduct(username: string, slug: string) {
  const fn = unstable_cache(
    async () => {
      const store = await db.query.stores.findFirst({ where: and(eq(stores.username, username.toLowerCase()), eq(stores.published, true)) });
      if (!store) return null;
      const product = await db.query.products.findFirst({
        where: and(eq(products.storeId, store.id), eq(products.slug, slug.toLowerCase()), eq(products.status, "published"), isNull(products.deletedAt)),
      });
      if (!product) return null;
      const [files, links, approvedReviews, variants, bump] = await Promise.all([
        db.select().from(productFiles).where(eq(productFiles.productId, product.id)).orderBy(asc(productFiles.position)),
        db.select().from(productLinks).where(eq(productLinks.productId, product.id)).orderBy(asc(productLinks.position)),
        db.select().from(reviews).where(and(eq(reviews.productId, product.id), eq(reviews.approved, true))),
        // Pricing tiers, in display order.
        db.select().from(productVariants).where(eq(productVariants.productId, product.id)).orderBy(asc(productVariants.position)),
        // Order bump: same store, paid, published, live download. Re-checked live at checkout.
        product.bumpProductId && product.bumpProductId !== product.id
          ? db.query.products.findFirst({
              where: and(
                eq(products.id, product.bumpProductId),
                eq(products.storeId, store.id),
                eq(products.status, "published"),
                eq(products.type, "download"),
                isNull(products.deletedAt),
              ),
            })
          : Promise.resolve(undefined),
      ]);
      return { store, product, files, links, reviews: approvedReviews, variants, bump: bump && bump.priceCents > 0 ? bump : null };
    },
    ["public-product", username.toLowerCase(), slug.toLowerCase()],
    { tags: [storeTag(username)], revalidate: 300 },
  );
  return fn();
}

/** Dashboard: everything for the creator's store, uncached. */
export async function getStoreEditorData(storeId: string) {
  const [secs, prods, files] = await Promise.all([
    db.select().from(sections).where(eq(sections.storeId, storeId)).orderBy(asc(sections.position)),
    db.select().from(products).where(and(eq(products.storeId, storeId), isNull(products.deletedAt))).orderBy(asc(products.position)),
    db
      .select({ id: productFiles.id, productId: productFiles.productId, filename: productFiles.filename, bytes: productFiles.bytes })
      .from(productFiles)
      .innerJoin(products, eq(products.id, productFiles.productId))
      .where(eq(products.storeId, storeId)),
  ]);
  return { sections: secs, products: prods, files };
}

/** A product whose slug was renamed: old slugs are kept on the row so links in old posts still resolve. Uncached, only hit on a miss. */
export async function findProductByPreviousSlug(username: string, slug: string) {
  const store = await db.query.stores.findFirst({ where: and(eq(stores.username, username.toLowerCase()), eq(stores.published, true)), columns: { id: true } });
  if (!store) return null;
  return db.query.products.findFirst({
    where: and(eq(products.storeId, store.id), eq(products.status, "published"), isNull(products.deletedAt), sql`${products.previousSlugs} @> ARRAY[${slug.toLowerCase()}]::text[]`),
    columns: { slug: true },
  });
}
