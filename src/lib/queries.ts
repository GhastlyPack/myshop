import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "@/db";
import { productFiles, productLinks, products, reviews, sections, stores } from "@/db/schema";

/**
 * Shared read queries. Public storefront reads are cached by username tag so a
 * bio-link spike never hits Postgres; every dashboard mutation calls
 * revalidateStore(username).
 */
export const storeTag = (username: string) => `store:${username.toLowerCase()}`;

export function revalidateStore(username: string) {
  revalidateTag(storeTag(username), "max");
}

export const getPublicStore = unstable_cache(
  async (usernameRaw: string) => {
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
    return { store, sections: secs, products: prods };
  },
  ["public-store"],
  { tags: [], revalidate: 300 },
);

/** Uncached variant that also applies the username tag (used by the page so the tag attaches). */
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
      const [files, links, approvedReviews] = await Promise.all([
        db.select().from(productFiles).where(eq(productFiles.productId, product.id)).orderBy(asc(productFiles.position)),
        db.select().from(productLinks).where(eq(productLinks.productId, product.id)).orderBy(asc(productLinks.position)),
        db.select().from(reviews).where(and(eq(reviews.productId, product.id), eq(reviews.approved, true))),
      ]);
      return { store, product, files, links, reviews: approvedReviews };
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
