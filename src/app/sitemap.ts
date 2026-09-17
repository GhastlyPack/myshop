import type { MetadataRoute } from "next";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { products, stores } from "@/db/schema";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 3600;

const STATIC: [string, MetadataRoute.Sitemap[number]["changeFrequency"], number][] = [
  ["/", "weekly", 1],
  ["/pricing", "monthly", 0.8],
  ["/compare", "monthly", 0.8],
  ["/compare/stan-store", "monthly", 0.8],
  ["/compare/linktree", "monthly", 0.7],
  ["/compare/beacons", "monthly", 0.6],
  ["/compare/gumroad", "monthly", 0.6],
  ["/guides/sell-digital-products-from-instagram-bio", "monthly", 0.8],
  ["/faq", "monthly", 0.6],
  ["/creators", "daily", 0.6],
  ["/changelog", "weekly", 0.4],
  ["/privacy", "yearly", 0.2],
  ["/terms", "yearly", 0.2],
];

/** Every public page: marketing routes, then each published store and its listed, published products. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [storeRows, productRows] = await Promise.all([
    db.select({ username: stores.username, updatedAt: stores.updatedAt }).from(stores).where(eq(stores.published, true)),
    db
      .select({ username: stores.username, slug: products.slug, updatedAt: products.updatedAt })
      .from(products)
      .innerJoin(stores, eq(stores.id, products.storeId))
      .where(and(eq(stores.published, true), eq(products.status, "published"), eq(products.listed, true), isNull(products.deletedAt))),
  ]);
  return [
    ...STATIC.map(([path, changeFrequency, priority]) => ({ url: absoluteUrl(path), lastModified: now, changeFrequency, priority })),
    ...storeRows.map((s) => ({ url: absoluteUrl(`/${s.username}`), lastModified: s.updatedAt ?? now, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...productRows.map((p) => ({ url: absoluteUrl(`/${p.username}/${p.slug}`), lastModified: p.updatedAt ?? now, changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}
