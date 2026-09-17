import "server-only";
import { getCurrentStore } from "@/lib/auth";
import { isProd } from "@/lib/env";
import { resolveTheme, themeSchema, type ResolvedTheme, type Theme } from "@/lib/theme";

/**
 * Design-editor preview contract:
 *   /[username]?previewTheme=<base64url(JSON.stringify(theme))>
 * The JSON is validated with `themeSchema.safeParse`; invalid input falls back
 * to the saved theme. Dev: always honored. Prod: only when the signed-in
 * creator owns the store. Pages that receive it are dynamic (uncached).
 */
export function parsePreviewTheme(raw: string | string[] | undefined): Theme | null {
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (!s || s.length > 8000) return null;
  try {
    const json = JSON.parse(Buffer.from(s, "base64url").toString("utf8"));
    const parsed = themeSchema.safeParse(json);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function resolveStoreTheme(
  store: { id: string; theme: Theme },
  previewRaw: string | string[] | undefined,
): Promise<{ theme: ResolvedTheme; isPreview: boolean }> {
  const preview = parsePreviewTheme(previewRaw);
  if (!preview) return { theme: resolveTheme(store.theme), isPreview: false };
  if (isProd) {
    const mine = await getCurrentStore();
    if (mine?.id !== store.id) return { theme: resolveTheme(store.theme), isPreview: false };
  }
  return { theme: resolveTheme(preview), isPreview: true };
}
