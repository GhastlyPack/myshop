import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { getCurrentStore, loginPath } from "@/lib/auth";
import { env } from "@/lib/env";
import { newId, newToken } from "@/lib/ids";

export const dynamic = "force-dynamic";

/**
 * GET /app/products/new → creates a draft and redirects to its editor.
 * A route handler (not a page) because creating during render can't revalidate.
 * Drafts are not public, so no storefront revalidation is needed here.
 */
export async function GET() {
  const store = await getCurrentStore();
  if (!store) return NextResponse.redirect(new URL(loginPath("/app"), env.APP_BASE_URL));
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${products.position}), -1)` })
    .from(products)
    .where(eq(products.storeId, store.id));
  const id = newId("prd");
  await db.insert(products).values({
    id,
    storeId: store.id,
    title: "Untitled product",
    slug: `untitled-${newToken().slice(0, 6).toLowerCase()}`,
    currency: store.currency,
    position: Number(max) + 1,
    status: "draft",
  });
  return NextResponse.redirect(new URL(`/app/products/${id}`, env.APP_BASE_URL), 303);
}
