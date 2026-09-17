"use server";

import { and, asc, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { productFiles, productLinks, products, sections, type CustomField } from "@/db/schema";
import { requireStore } from "@/lib/auth";
import { newId } from "@/lib/ids";
import { productInputSchema, toSlug, type ProductInput } from "@/lib/product-input";
import { revalidateStore } from "@/lib/queries";
import { deleteObject } from "@/lib/storage";

async function ownProduct(id: string, storeId: string) {
  return db.query.products.findFirst({ where: and(eq(products.id, String(id)), eq(products.storeId, storeId)) });
}

/**
 * Saves the editor form. intent "publish" also validates publish requirements and
 * flips status; "unpublish" saves and sets draft.
 */
export async function saveProduct(id: string, input: ProductInput, intent: "save" | "publish" | "unpublish" = "save"): Promise<SaveResult> {
  const { store } = await requireStore();
  const product = await ownProduct(id, store.id);
  if (!product) return { ok: false, errors: { form: "Product not found." } };

  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!errors[key]) errors[key] = issue.message;
    }
    return { ok: false, errors };
  }
  const d = parsed.data;
  const errors: Record<string, string> = {};

  // Uploaded objects must belong to this store.
  const prefix = `${store.id}/`;
  if (d.thumbnailKey && !d.thumbnailKey.startsWith(prefix)) errors.thumbnailKey = "Invalid image.";
  if (d.bannerKey && !d.bannerKey.startsWith(prefix)) errors.bannerKey = "Invalid image.";

  // Slug: derive from title when blank, must be unique in this store.
  let slug = toSlug(d.slug || d.title);
  if (!slug) slug = product.slug;
  const clash = await db.query.products.findFirst({
    where: and(eq(products.storeId, store.id), eq(products.slug, slug), ne(products.id, product.id)),
    columns: { id: true },
  });
  if (clash) errors.slug = "Another product already uses this slug.";

  // Section must be ours.
  let sectionId: string | null = null;
  if (d.sectionId) {
    const sec = await db.query.sections.findFirst({ where: and(eq(sections.id, d.sectionId), eq(sections.storeId, store.id)), columns: { id: true } });
    if (!sec) errors.sectionId = "Pick a section from your store.";
    else sectionId = sec.id;
  }

  // Select-type fields need options.
  for (const f of d.fields) {
    if ((f.type === "select" || f.type === "multiselect") && !(f.options ?? []).filter(Boolean).length) {
      errors.fields = `"${f.label}" needs at least one option.`;
      break;
    }
  }

  let status = product.status;
  if (intent === "publish") {
    if (!d.title) errors.title = "Add a title before publishing.";
    if (d.type === "download") {
      const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(productFiles).where(eq(productFiles.productId, product.id));
      if (Number(n) === 0) errors.files = "Upload at least one file before publishing.";
    } else if (d.links.length === 0) {
      errors.links = "Add at least one link before publishing.";
    }
    if (Object.keys(errors).length === 0) status = "published";
  } else if (intent === "unpublish") {
    status = "draft";
  }
  if (Object.keys(errors).length) return { ok: false, errors };

  const title = d.title || "Untitled product";
  const fields: CustomField[] = d.fields.map((f) => ({
    id: f.id,
    label: f.label,
    type: f.type,
    required: f.required,
    ...(f.type === "select" || f.type === "multiselect" ? { options: (f.options ?? []).filter(Boolean) } : {}),
  }));

  await db.transaction(async (tx) => {
    await tx
      .update(products)
      .set({
        title,
        subtitle: d.subtitle || null,
        slug,
        description: d.description || null,
        type: d.type,
        priceCents: d.priceCents,
        currency: store.currency,
        cardStyle: d.cardStyle,
        buttonText: d.buttonText,
        thumbnailKey: d.thumbnailKey,
        bannerKey: d.bannerKey,
        sectionId,
        fields,
        marketingOptIn: d.marketingOptIn,
        confirmationSubject: d.confirmationSubject || null,
        confirmationBody: d.confirmationBody || null,
        listed: d.listed,
        dmKeyword: d.dmKeyword || null,
        status,
      })
      .where(eq(products.id, product.id));
    await tx.delete(productLinks).where(eq(productLinks.productId, product.id));
    if (d.links.length) {
      await tx.insert(productLinks).values(d.links.map((l, i) => ({ id: newId("lnk"), productId: product.id, url: l.url, label: l.label, position: i })));
    }
  });

  // Orphaned images are cleaned up best-effort.
  for (const [oldKey, newKey] of [
    [product.thumbnailKey, d.thumbnailKey],
    [product.bannerKey, d.bannerKey],
  ] as const) {
    if (oldKey && oldKey !== newKey) await deleteObject("public", oldKey).catch(() => {});
  }

  revalidateStore(store.username);
  revalidatePath("/app");
  revalidatePath(`/app/products/${product.id}`);
  return { ok: true, slug, status };
}

export type SaveResult =
  | { ok: true; slug: string; status: "draft" | "published" }
  | { ok: false; errors: Record<string, string> };

const fileMetaSchema = z.object({
  key: z.string().min(1).max(500),
  filename: z.string().trim().min(1).max(255),
  bytes: z.number().int().min(0),
  mime: z.string().max(120).nullable(),
});

export type FileRow = { id: string; filename: string; bytes: number; mime: string | null };

/** Records an uploaded file (the bytes are already in storage under `key`). */
export async function addProductFile(productId: string, meta: z.input<typeof fileMetaSchema>): Promise<{ ok: true; file: FileRow } | { ok: false; error: string }> {
  const { store } = await requireStore();
  const product = await ownProduct(productId, store.id);
  if (!product) return { ok: false, error: "Product not found." };
  const parsed = fileMetaSchema.safeParse(meta);
  if (!parsed.success) return { ok: false, error: "Invalid file." };
  if (!parsed.data.key.startsWith(`${store.id}/product/`)) return { ok: false, error: "Invalid file." };
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${productFiles.position}), -1)` })
    .from(productFiles)
    .where(eq(productFiles.productId, product.id));
  const [row] = await db
    .insert(productFiles)
    .values({
      id: newId("fil"),
      productId: product.id,
      storageKey: parsed.data.key,
      filename: parsed.data.filename,
      bytes: parsed.data.bytes,
      mime: parsed.data.mime,
      position: Number(max) + 1,
    })
    .returning();
  revalidateStore(store.username);
  return { ok: true, file: { id: row.id, filename: row.filename, bytes: row.bytes, mime: row.mime } };
}

export async function deleteProductFile(productId: string, fileId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { store } = await requireStore();
  const product = await ownProduct(productId, store.id);
  if (!product) return { ok: false, error: "Product not found." };
  const file = await db.query.productFiles.findFirst({ where: and(eq(productFiles.id, String(fileId)), eq(productFiles.productId, product.id)) });
  if (!file) return { ok: false, error: "File not found." };
  await db.delete(productFiles).where(eq(productFiles.id, file.id));
  await deleteObject("files", file.storageKey).catch(() => {});
  revalidateStore(store.username);
  return { ok: true };
}

/** Deletes the product, its rows (cascade) and every stored object. */
export async function deleteProduct(id: string): Promise<never | { ok: false; error: string }> {
  const { store } = await requireStore();
  const product = await ownProduct(id, store.id);
  if (!product) return { ok: false, error: "Product not found." };
  const files = await db.select().from(productFiles).where(eq(productFiles.productId, product.id)).orderBy(asc(productFiles.position));
  await db.delete(products).where(eq(products.id, product.id));
  await Promise.all([
    ...files.map((f) => deleteObject("files", f.storageKey).catch(() => {})),
    product.thumbnailKey ? deleteObject("public", product.thumbnailKey).catch(() => {}) : Promise.resolve(),
    product.bannerKey ? deleteObject("public", product.bannerKey).catch(() => {}) : Promise.resolve(),
  ]);
  revalidateStore(store.username);
  revalidatePath("/app");
  redirect("/app");
}
