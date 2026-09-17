"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { stores } from "@/db/schema";
import { requireStore } from "@/lib/auth";
import { revalidateStore } from "@/lib/queries";
import { publicUrl } from "@/lib/storage";
import { themeSchema, type ResolvedTheme } from "@/lib/theme";

export type SaveThemeResult = { ok: true; theme: ResolvedTheme } | { ok: false; error: string };

/** Validate and persist the creator's theme, then bust the storefront cache. */
export async function saveTheme(input: unknown): Promise<SaveThemeResult> {
  const { store } = await requireStore();
  const parsed = themeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Some design values are invalid. Reset to saved and try again." };
  const theme = parsed.data;

  // Only accept background images uploaded by this store (or the one already saved).
  const savedKey = store.theme?.bgImageKey ?? null;
  if (theme.bgImageKey && theme.bgImageKey !== savedKey && !theme.bgImageKey.startsWith(`${store.id}/`)) {
    return { ok: false, error: "That background image does not belong to this store." };
  }

  await db.update(stores).set({ theme }).where(eq(stores.id, store.id));
  revalidateStore(store.username);
  return { ok: true, theme };
}

/** `publicUrl` is server-only; the editor calls this to show a thumbnail for a freshly uploaded key. */
export async function resolvePublicUrl(key: string): Promise<string | null> {
  const { store } = await requireStore();
  if (!key.startsWith(`${store.id}/`)) return null;
  return publicUrl(key);
}
