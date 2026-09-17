"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { products, sections } from "@/db/schema";
import { requireStore } from "@/lib/auth";
import { newId, newToken } from "@/lib/ids";
import { revalidateStore } from "@/lib/queries";

export type ActionResult = { ok: true } | { ok: false; error: string };

const reorderSchema = z
  .array(z.object({ id: z.string().min(1), sectionId: z.string().nullable() }))
  .max(1000);

/**
 * Persists the full board order: items are listed top-to-bottom across all
 * sections (unsectioned first). Position is global per store.
 */
export async function reorderProducts(items: z.input<typeof reorderSchema>): Promise<ActionResult> {
  const { store } = await requireStore();
  const parsed = reorderSchema.safeParse(items);
  if (!parsed.success) return { ok: false, error: "Invalid order." };

  const [mine, secs] = await Promise.all([
    db.select({ id: products.id }).from(products).where(eq(products.storeId, store.id)),
    db.select({ id: sections.id }).from(sections).where(eq(sections.storeId, store.id)),
  ]);
  const known = new Set(mine.map((p) => p.id));
  const knownSections = new Set(secs.map((s) => s.id));

  await db.transaction(async (tx) => {
    let pos = 0;
    for (const it of parsed.data) {
      if (!known.has(it.id)) continue;
      const sectionId = it.sectionId && knownSections.has(it.sectionId) ? it.sectionId : null;
      await tx
        .update(products)
        .set({ position: pos++, sectionId })
        .where(and(eq(products.id, it.id), eq(products.storeId, store.id)));
    }
  });
  revalidateStore(store.username);
  revalidatePath("/app");
  return { ok: true };
}

/** Creates a draft with a placeholder title and sends the creator to the editor. */
export async function createProduct(): Promise<never> {
  const { store } = await requireStore();
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
  revalidateStore(store.username);
  revalidatePath("/app");
  redirect(`/app/products/${id}`);
}
