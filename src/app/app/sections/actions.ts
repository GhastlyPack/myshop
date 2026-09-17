"use server";

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { products, sections } from "@/db/schema";
import { requireStore } from "@/lib/auth";
import { newId } from "@/lib/ids";
import { revalidateStore } from "@/lib/queries";

const title = z.string().trim().min(1, "Give the section a name.").max(80, "Keep it under 80 characters.");

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createSection(rawTitle: string): Promise<ActionResult> {
  const { store } = await requireStore();
  const parsed = title.safeParse(rawTitle);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid title." };
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${sections.position}), -1)` })
    .from(sections)
    .where(eq(sections.storeId, store.id));
  await db.insert(sections).values({ id: newId("sec"), storeId: store.id, title: parsed.data, position: Number(max) + 1 });
  revalidateStore(store.username);
  revalidatePath("/app");
  return { ok: true };
}

export async function renameSection(id: string, rawTitle: string): Promise<ActionResult> {
  const { store } = await requireStore();
  const parsed = title.safeParse(rawTitle);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid title." };
  const res = await db
    .update(sections)
    .set({ title: parsed.data })
    .where(and(eq(sections.id, String(id)), eq(sections.storeId, store.id)))
    .returning({ id: sections.id });
  if (!res.length) return { ok: false, error: "Section not found." };
  revalidateStore(store.username);
  revalidatePath("/app");
  return { ok: true };
}

/** Products in the section become unsectioned (FK is also ON DELETE SET NULL). */
export async function deleteSection(id: string): Promise<ActionResult> {
  const { store } = await requireStore();
  const sec = await db.query.sections.findFirst({ where: and(eq(sections.id, String(id)), eq(sections.storeId, store.id)) });
  if (!sec) return { ok: false, error: "Section not found." };
  await db.update(products).set({ sectionId: null }).where(and(eq(products.sectionId, sec.id), eq(products.storeId, store.id)));
  await db.delete(sections).where(eq(sections.id, sec.id));
  revalidateStore(store.username);
  revalidatePath("/app");
  return { ok: true };
}

export async function reorderSections(ids: string[]): Promise<ActionResult> {
  const { store } = await requireStore();
  const parsed = z.array(z.string().min(1)).max(200).safeParse(ids);
  if (!parsed.success) return { ok: false, error: "Invalid order." };
  const mine = await db
    .select({ id: sections.id })
    .from(sections)
    .where(eq(sections.storeId, store.id))
    .orderBy(asc(sections.position));
  const known = new Set(mine.map((s) => s.id));
  const ordered = parsed.data.filter((id) => known.has(id));
  // Anything not mentioned keeps relative order at the end.
  for (const s of mine) if (!ordered.includes(s.id)) ordered.push(s.id);
  await db.transaction(async (tx) => {
    for (let i = 0; i < ordered.length; i++) {
      await tx.update(sections).set({ position: i }).where(and(eq(sections.id, ordered[i]), inArray(sections.id, [...known])));
    }
  });
  revalidateStore(store.username);
  revalidatePath("/app");
  return { ok: true };
}
