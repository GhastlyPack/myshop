import { z } from "zod";
import type { StorePixels } from "@/db/schema";

export type { StorePixels };

/**
 * Per-creator ad pixels. Validation + a small resolver shared by the settings form,
 * the storefront pixel loader, and the event dispatchers. No server-only imports, so
 * both client and server can use it.
 */

// A Meta Pixel ID is a 15–16 digit number. Google tags are G-/AW-/GT-XXXX. TikTok pixel
// ids are ~20-char alphanumeric codes. Each field is optional; empty means "not set".
const metaPixelId = z
  .string()
  .trim()
  .regex(/^\d{15,16}$/, "Meta Pixel ID is a 15–16 digit number.");
const metaCapiToken = z.string().trim().min(20, "That access token looks too short.").max(400);
const googleTagId = z
  .string()
  .trim()
  .regex(/^(G|AW|GT)-[A-Z0-9]+$/i, "Use a Google tag ID like G-XXXXXXX or AW-XXXXXXXXX.");
const tiktokPixelId = z
  .string()
  .trim()
  .regex(/^[A-Z0-9]{15,30}$/i, "A TikTok Pixel ID is a ~20-character code from Events Manager.");

const optional = <T extends z.ZodTypeAny>(s: T) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), s.optional());

/** Raw form input → a clean {@link StorePixels}. Blank fields drop out. */
export const pixelsInputSchema = z
  .object({
    metaPixelId: optional(metaPixelId),
    metaCapiToken: optional(metaCapiToken),
    googleTagId: optional(googleTagId),
    tiktokPixelId: optional(tiktokPixelId),
  })
  .transform((v): StorePixels => {
    const out: StorePixels = {};
    // A CAPI token only makes sense with a pixel id, so it's dropped without one.
    if (v.metaPixelId) out.meta = { pixelId: v.metaPixelId, ...(v.metaCapiToken ? { capiToken: v.metaCapiToken } : {}) };
    if (v.googleTagId) out.google = { tagId: v.googleTagId };
    if (v.tiktokPixelId) out.tiktok = { pixelId: v.tiktokPixelId };
    return out;
  });

/** Non-secret fields for the settings form. The CAPI token is never sent to the client; only whether one is saved. */
export type PixelsFormInput = {
  metaPixelId: string;
  googleTagId: string;
  tiktokPixelId: string;
  metaCapiTokenSet: boolean;
};

export function pixelsToForm(p: StorePixels | null | undefined): PixelsFormInput {
  return {
    metaPixelId: p?.meta?.pixelId ?? "",
    googleTagId: p?.google?.tagId ?? "",
    tiktokPixelId: p?.tiktok?.pixelId ?? "",
    metaCapiTokenSet: Boolean(p?.meta?.capiToken),
  };
}

export type ResolvedPixels = {
  /** Every Meta pixel to fire on the storefront: the platform's plus the creator's, digits only. */
  metaIds: string[];
  googleTagId?: string;
  tiktokPixelId?: string;
};

/** Merge the platform pixel with the creator's for firing on a storefront page. */
export function resolveStorePixels(pixels: StorePixels | null | undefined, platformMetaId?: string | null): ResolvedPixels {
  const metaIds: string[] = [];
  const platform = (platformMetaId ?? "").replace(/\D/g, "");
  if (platform) metaIds.push(platform);
  const creator = (pixels?.meta?.pixelId ?? "").replace(/\D/g, "");
  if (creator && creator !== platform) metaIds.push(creator);
  return {
    metaIds,
    googleTagId: pixels?.google?.tagId?.trim() || undefined,
    tiktokPixelId: pixels?.tiktok?.pixelId?.trim() || undefined,
  };
}

export function hasAnyPixel(r: ResolvedPixels): boolean {
  return r.metaIds.length > 0 || Boolean(r.googleTagId) || Boolean(r.tiktokPixelId);
}

/** Canonical storefront events, mapped per provider by the client dispatcher. */
export type PixelEventName = "ViewContent" | "InitiateCheckout" | "Lead" | "Purchase";
