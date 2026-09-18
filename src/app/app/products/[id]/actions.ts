"use server";

import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { discountCodes, productFiles, productLinks, products, sections, type CustomField, type DiscountCode } from "@/db/schema";
import { requireStore } from "@/lib/auth";
import { canOfferBump } from "@/lib/commerce";
import { planTier, storeHasBilling } from "@/lib/billing";
import { newId } from "@/lib/ids";
import { discountCodeInputSchema, productInputSchema, toSlug, type DiscountCodeInput, type ProductInput } from "@/lib/product-input";
import { revalidateStore } from "@/lib/queries";
import { deleteObject } from "@/lib/storage";

async function ownProduct(id: string, storeId: string) {
  return db.query.products.findFirst({ where: and(eq(products.id, String(id)), eq(products.storeId, storeId), isNull(products.deletedAt)) });
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

  const tier = await planTier(store);
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
  const previousSlugs = slug !== product.slug ? [...product.previousSlugs.filter((s) => s !== slug), product.slug].slice(-10) : product.previousSlugs;

  // Section must be ours.
  let sectionId: string | null = null;
  if (d.sectionId) {
    const sec = await db.query.sections.findFirst({ where: and(eq(sections.id, d.sectionId), eq(sections.storeId, store.id)), columns: { id: true } });
    if (!sec) errors.sectionId = "Pick a section from your store.";
    else sectionId = sec.id;
  }

  // Order bump: another paid, published, live product from this store; only on a card-payable product.
  let bumpProductId: string | null = null;
  if (d.bumpProductId) {
    if (!canOfferBump(d)) errors.bumpProductId = "Order bumps need a price of at least $0.50 on this product.";
    else if (d.bumpProductId === product.id) errors.bumpProductId = "A product can't bump itself.";
    else {
      const bump = await db.query.products.findFirst({
        where: and(eq(products.id, d.bumpProductId), eq(products.storeId, store.id), eq(products.status, "published"), isNull(products.deletedAt)),
        columns: { id: true, priceCents: true, type: true },
      });
      if (!bump || bump.priceCents <= 0 || bump.type === "link") errors.bumpProductId = "Pick a paid, published download from your store.";
      else bumpProductId = bump.id;
    }
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

  // Server-side plan enforcement (the UI hides these for Basic, this closes the direct-call hole).
  // Basic sellers keep any Pro config already saved on this product, but can't add/change it here.
  const proOnly = tier === "pro";
  const effBumpProductId = proOnly ? bumpProductId : product.bumpProductId;
  const effBumpHeadline = proOnly ? d.bumpHeadline || null : product.bumpHeadline;
  const effBumpDiscountPercent = proOnly ? d.bumpDiscountPercent : product.bumpDiscountPercent;
  const effQuantityLimit = proOnly ? d.quantityLimit : product.quantityLimit;
  const effFields = proOnly ? d.fields : (product.fields as typeof d.fields);

  const title = d.title || "Untitled product";
  const fields: CustomField[] = effFields.map((f) => ({
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
        previousSlugs,
        description: d.description || null,
        type: d.type,
        priceCents: d.priceCents,
        durationMinutes: d.type === "booking" ? (d.durationMinutes ?? 60) : null,
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
        dmReplyText: d.dmReplyText || null,
        quantityLimit: effQuantityLimit,
        bumpProductId: effBumpProductId,
        bumpHeadline: effBumpProductId ? effBumpHeadline : null,
        bumpDiscountPercent: effBumpProductId ? effBumpDiscountPercent : 0,
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
export async function addProductFile(productId: string, meta: z.input<typeof fileMetaSchema>): Promise<{ ok: true; file: FileRow } | { ok: false; error: string; code?: "card_required" }> {
  const { store } = await requireStore();
  // The card gate: uploading a deliverable requires a plan (trialing/active/comped).
  if (!(await storeHasBilling(store))) {
    return { ok: false, error: "Add a card to start your free trial before uploading files.", code: "card_required" };
  }
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

/**
 * Archives the product. It vanishes from the storefront and dashboard, but the row,
 * its files, and every order/entitlement stay, so sales history is intact and buyers
 * keep their downloads. The slug is released so the creator can reuse it.
 */
export async function deleteProduct(id: string): Promise<never | { ok: false; error: string }> {
  const { store } = await requireStore();
  const product = await ownProduct(id, store.id);
  if (!product) return { ok: false, error: "Product not found." };
  await db
    .update(products)
    .set({ deletedAt: new Date(), status: "draft", listed: false, slug: `${product.slug}--archived-${Date.now().toString(36)}` })
    .where(eq(products.id, product.id));
  revalidateStore(store.username);
  revalidatePath("/app");
  redirect("/app");
}

// ---------- discount codes ----------

export type DiscountCodeRow = Pick<DiscountCode, "id" | "code" | "percentOff" | "amountOffCents" | "maxUses" | "uses" | "expiresAt" | "active" | "createdAt">;

const toRow = (r: DiscountCode): DiscountCodeRow => ({
  id: r.id,
  code: r.code,
  percentOff: r.percentOff,
  amountOffCents: r.amountOffCents,
  maxUses: r.maxUses,
  uses: r.uses,
  expiresAt: r.expiresAt,
  active: r.active,
  createdAt: r.createdAt,
});

export async function addDiscountCode(productId: string, input: DiscountCodeInput): Promise<{ ok: true; code: DiscountCodeRow } | { ok: false; error: string }> {
  const { store } = await requireStore();
  if ((await planTier(store)) !== "pro") return { ok: false, error: "Discount codes are a Pro feature." };
  const product = await ownProduct(productId, store.id);
  if (!product) return { ok: false, error: "Product not found." };
  const parsed = discountCodeInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the code." };
  const d = parsed.data;
  if (d.kind === "percent" && d.value > 100) return { ok: false, error: "Percent off can't exceed 100." };
  if (d.kind === "amount" && product.priceCents > 0 && d.value > product.priceCents) return { ok: false, error: "Amount off can't exceed the price." };
  // End of the chosen day (UTC) so the code works through that date.
  const expiresAt = d.expiresAt ? new Date(`${d.expiresAt}T23:59:59.999Z`) : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) return { ok: false, error: "Pick a valid date." };
  const clash = await db.query.discountCodes.findFirst({ where: and(eq(discountCodes.productId, product.id), eq(discountCodes.code, d.code)), columns: { id: true } });
  if (clash) return { ok: false, error: "That code already exists on this product." };
  const [row] = await db
    .insert(discountCodes)
    .values({
      id: newId("dsc"),
      productId: product.id,
      code: d.code,
      percentOff: d.kind === "percent" ? d.value : null,
      amountOffCents: d.kind === "amount" ? d.value : null,
      maxUses: d.maxUses,
      expiresAt,
    })
    .returning();
  return { ok: true, code: toRow(row) };
}

export async function setDiscountCodeActive(productId: string, codeId: string, active: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  const { store } = await requireStore();
  const product = await ownProduct(productId, store.id);
  if (!product) return { ok: false, error: "Product not found." };
  const rows = await db
    .update(discountCodes)
    .set({ active })
    .where(and(eq(discountCodes.id, String(codeId)), eq(discountCodes.productId, product.id)))
    .returning({ id: discountCodes.id });
  return rows.length ? { ok: true } : { ok: false, error: "Code not found." };
}

export async function deleteDiscountCode(productId: string, codeId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { store } = await requireStore();
  const product = await ownProduct(productId, store.id);
  if (!product) return { ok: false, error: "Product not found." };
  const rows = await db
    .delete(discountCodes)
    .where(and(eq(discountCodes.id, String(codeId)), eq(discountCodes.productId, product.id)))
    .returning({ id: discountCodes.id });
  return rows.length ? { ok: true } : { ok: false, error: "Code not found." };
}
