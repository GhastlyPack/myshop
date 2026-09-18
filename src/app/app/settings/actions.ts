"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { instagramAccounts, instagramBetaRequests, productFiles, products, stores, type SocialLinks } from "@/db/schema";
import { requireStore } from "@/lib/auth";
import { planTier, storeHasBilling } from "@/lib/billing";
import { CURRENCIES } from "@/lib/format";
import { pixelsInputSchema } from "@/lib/pixels";
import { newId } from "@/lib/ids";
import { revalidateStore } from "@/lib/queries";
import { normalizeUsername, usernameError } from "@/lib/reserved";
import { deleteObject } from "@/lib/storage";

const handle = z.string().trim().max(120);
const url = z.union([z.literal(""), z.string().trim().url("Enter a full URL, including https://").max(500)]);

const profileSchema = z.object({
  displayName: z.string().trim().min(1, "Add a display name.").max(80, "Keep it under 80 characters."),
  bio: z.string().trim().max(300, "Keep your bio under 300 characters."),
  about: z.string().trim().max(4000, "Keep the about section under 4,000 characters."),
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
    .set({ displayName: d.displayName, bio: d.bio || null, about: d.about || null, avatarKey: d.avatarKey, currency: d.currency, socials })
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

export type PixelsInput = { metaPixelId?: string; metaCapiToken?: string; googleTagId?: string; tiktokPixelId?: string };

/** Save the creator's own ad pixels. Pro-only. A blank CAPI token keeps the saved one when the pixel is unchanged. */
export async function updatePixels(input: PixelsInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const { store } = await requireStore();
  if ((await planTier(store)) !== "pro") return { ok: false, error: "Pixel tracking is a Pro feature." };
  const parsed = pixelsInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your pixel IDs and try again." };
  const next = parsed.data;
  // Keep the existing Conversions API token if the form left it blank and the pixel id is unchanged.
  const prev = store.pixels;
  if (next.meta?.pixelId && !next.meta.capiToken && prev?.meta?.capiToken && prev.meta.pixelId === next.meta.pixelId) {
    next.meta.capiToken = prev.meta.capiToken;
  }
  await db.update(stores).set({ pixels: next }).where(eq(stores.id, store.id));
  revalidateStore(store.username);
  revalidatePath("/app/settings");
  return { ok: true };
}

export async function setStorePublished(published: boolean): Promise<{ ok: true } | { ok: false; error: string; code?: "card_required" }> {
  const { store } = await requireStore();
  // The card gate: going live requires a plan (trialing/active/comped). Unpublishing is always allowed.
  if (published && !(await storeHasBilling(store))) {
    return { ok: false, error: "Add a card to start your free trial before you go live.", code: "card_required" };
  }
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

/** Change the store's public link (visitmy.shop/<username>). Old link stops working immediately. */
export async function changeUsername(raw: string): Promise<{ ok: true; username: string } | { ok: false; error: string }> {
  const { store } = await requireStore();
  const username = normalizeUsername(String(raw ?? ""));
  if (username === store.username) return { ok: true, username };
  const err = usernameError(username);
  if (err) return { ok: false, error: err };
  const taken = await db.query.stores.findFirst({ where: eq(stores.username, username), columns: { id: true } });
  if (taken) return { ok: false, error: "That username is taken." };
  const old = store.username;
  await db.update(stores).set({ username }).where(eq(stores.id, store.id));
  revalidateStore(old);
  revalidateStore(username);
  revalidatePath("/app", "layout");
  return { ok: true, username };
}

// ---------- Instagram ----------
export async function setInstagramOptions(patch: { publicReply?: boolean; active?: boolean }): Promise<{ ok: true } | { ok: false; error: string }> {
  const { store } = await requireStore();
  const set: Partial<{ publicReply: boolean; active: boolean }> = {};
  if (typeof patch.publicReply === "boolean") set.publicReply = patch.publicReply;
  if (typeof patch.active === "boolean") set.active = patch.active;
  if (Object.keys(set).length === 0) return { ok: false, error: "Nothing to change." };
  await db.update(instagramAccounts).set(set).where(eq(instagramAccounts.storeId, store.id));
  revalidatePath("/app/settings");
  return { ok: true };
}

export async function disconnectInstagram(): Promise<{ ok: true } | { ok: false; error: string }> {
  const { store } = await requireStore();
  await db.delete(instagramAccounts).where(eq(instagramAccounts.storeId, store.id));
  revalidatePath("/app/settings");
  return { ok: true };
}

// ---------- Instagram beta ----------
export async function applyForInstagramBeta(rawUsername: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { store } = await requireStore();
  const username = rawUsername.trim().replace(/^@+/, "").toLowerCase();
  if (!/^[a-z0-9._]{1,30}$/.test(username)) return { ok: false, error: "Enter a valid Instagram username." };
  await db
    .insert(instagramBetaRequests)
    .values({ id: newId("igb"), storeId: store.id, igUsername: username, status: "pending" })
    .onConflictDoUpdate({ target: instagramBetaRequests.storeId, set: { igUsername: username, status: "pending" } });
  revalidatePath("/app/settings");
  return { ok: true };
}
