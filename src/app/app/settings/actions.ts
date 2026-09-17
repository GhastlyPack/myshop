"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { productFiles, products, stores, type SocialLinks } from "@/db/schema";
import { requireStore } from "@/lib/auth";
import { CURRENCIES } from "@/lib/format";
import { revalidateStore } from "@/lib/queries";
import { deleteObject } from "@/lib/storage";

const handle = z.string().trim().max(120);
const url = z.union([z.literal(""), z.string().trim().url("Enter a full URL, including https://").max(500)]);

const profileSchema = z.object({
  displayName: z.string().trim().min(1, "Add a display name.").max(80, "Keep it under 80 characters."),
  bio: z.string().trim().max(300, "Keep your bio under 300 characters."),
  avatarKey: z.string().nullable(),
  currency: z.enum(CURRENCIES),
  socials: z.object({
    instagram: handle,
    tiktok: handle,
    youtube: url,
    x: handle,
    threads: handle,
    linkedin: url,
    website: url,
    email: z.union([z.literal(""), z.string().trim().email("Enter a valid email.").max(200)]),
  }),
});
export type ProfileInput = z.input<typeof profileSchema>;

export type ProfileResult = { ok: true } | { ok: false; errors: Record<string, string> };

export async function updateProfile(input: ProfileInput): Promise<ProfileResult> {
  const { store } = await requireStore();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "form";
      if (!errors[key]) errors[key] = issue.message;
    }
    return { ok: false, errors };
  }
  const d = parsed.data;
  if (d.avatarKey && !d.avatarKey.startsWith(`${store.id}/`)) return { ok: false, errors: { avatarKey: "Invalid image." } };

  const socials: SocialLinks = {};
  for (const [k, v] of Object.entries(d.socials)) {
    const cleaned = k === "instagram" || k === "tiktok" || k === "x" || k === "threads" ? v.replace(/^@/, "") : v;
    if (cleaned) socials[k as keyof SocialLinks] = cleaned;
  }

  await db
    .update(stores)
    .set({ displayName: d.displayName, bio: d.bio || null, avatarKey: d.avatarKey, currency: d.currency, socials })
    .where(eq(stores.id, store.id));
  if (d.currency !== store.currency) {
    await db.update(products).set({ currency: d.currency }).where(eq(products.storeId, store.id));
  }
  if (store.avatarKey && store.avatarKey !== d.avatarKey) await deleteObject("public", store.avatarKey).catch(() => {});

  revalidateStore(store.username);
  revalidatePath("/app");
  revalidatePath("/app/settings");
  return { ok: true };
}

export async function setStorePublished(published: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  const { store } = await requireStore();
  await db.update(stores).set({ published: Boolean(published) }).where(eq(stores.id, store.id));
  revalidateStore(store.username);
  revalidatePath("/app");
  revalidatePath("/app/settings");
  return { ok: true };
}

/** Deletes the store and everything under it. Rows cascade; stored objects are removed best-effort. */
export async function deleteStore(confirmUsername: string): Promise<never | { ok: false; error: string }> {
  const { store } = await requireStore();
  if (String(confirmUsername ?? "").trim().toLowerCase() !== store.username) return { ok: false, error: "Type your username exactly to confirm." };

  const [prods, files] = await Promise.all([
    db.select({ thumbnailKey: products.thumbnailKey, bannerKey: products.bannerKey }).from(products).where(eq(products.storeId, store.id)),
    db
      .select({ storageKey: productFiles.storageKey })
      .from(productFiles)
      .innerJoin(products, eq(products.id, productFiles.productId))
      .where(eq(products.storeId, store.id)),
  ]);

  await db.delete(stores).where(eq(stores.id, store.id));

  const publicKeys = [store.avatarKey, store.theme?.bgImageKey ?? null, ...prods.flatMap((p) => [p.thumbnailKey, p.bannerKey])].filter((k): k is string => Boolean(k));
  await Promise.all([
    ...publicKeys.map((k) => deleteObject("public", k).catch(() => {})),
    ...files.map((f) => deleteObject("files", f.storageKey).catch(() => {})),
  ]);

  revalidateStore(store.username);
  revalidatePath("/app");
  redirect("/app/onboarding");
}
