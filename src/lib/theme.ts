import { z } from "zod";

/**
 * Store theme. Stored as jsonb on stores.theme, rendered as CSS variables on
 * the public storefront (see components/storefront/theme-vars.tsx).
 * Every field optional in storage; `resolveTheme` fills defaults.
 */
export const FONTS = {
  inter: { label: "Inter", css: "'Inter', system-ui, sans-serif", google: "Inter:wght@400;500;600;700" },
  dmsans: { label: "DM Sans", css: "'DM Sans', system-ui, sans-serif", google: "DM+Sans:wght@400;500;600;700" },
  playfair: { label: "Playfair Display", css: "'Playfair Display', Georgia, serif", google: "Playfair+Display:wght@400;500;600;700" },
  fraunces: { label: "Fraunces", css: "'Fraunces', Georgia, serif", google: "Fraunces:wght@400;500;600;700" },
  spacegrotesk: { label: "Space Grotesk", css: "'Space Grotesk', system-ui, sans-serif", google: "Space+Grotesk:wght@400;500;600;700" },
  poppins: { label: "Poppins", css: "'Poppins', system-ui, sans-serif", google: "Poppins:wght@400;500;600;700" },
  lora: { label: "Lora", css: "'Lora', Georgia, serif", google: "Lora:wght@400;500;600;700" },
  mono: { label: "JetBrains Mono", css: "'JetBrains Mono', ui-monospace, monospace", google: "JetBrains+Mono:wght@400;500;600;700" },
} as const;
export type FontKey = keyof typeof FONTS;

export const themeSchema = z.object({
  preset: z.string().optional(),
  headingFont: z.enum(Object.keys(FONTS) as [FontKey, ...FontKey[]]).default("inter"),
  bodyFont: z.enum(Object.keys(FONTS) as [FontKey, ...FontKey[]]).default("inter"),
  layout: z.enum(["list", "grid", "hero"]).default("list"),
  colors: z
    .object({
      bg: z.string().default("#ffffff"),
      surface: z.string().default("#f5f5f5"),
      text: z.string().default("#111111"),
      muted: z.string().default("#6b7280"),
      accent: z.string().default("#111111"),
      accentText: z.string().default("#ffffff"),
    })
    .prefault({}),
  buttonShape: z.enum(["square", "rounded", "pill"]).default("rounded"),
  cardShape: z.enum(["square", "rounded", "soft"]).default("rounded"),
  cardBorder: z.boolean().default(false),
  cardShadow: z.boolean().default(true),
  bgImageKey: z.string().nullable().default(null),
  bgOverlay: z.number().min(0).max(1).default(0),
  bgGradient: z.string().nullable().default(null), // css gradient string
  avatarShape: z.enum(["circle", "rounded", "square"]).default("circle"),
  avatarSize: z.enum(["sm", "md", "lg"]).default("md"),
  showBranding: z.boolean().default(true),
});

export type Theme = z.input<typeof themeSchema>;
export type ResolvedTheme = z.output<typeof themeSchema>;

export function resolveTheme(theme: Theme | null | undefined): ResolvedTheme {
  const parsed = themeSchema.safeParse(theme ?? {});
  return parsed.success ? parsed.data : themeSchema.parse({});
}

export const THEME_PRESETS: Record<string, { label: string; theme: Theme }> = {
  clean: { label: "Clean", theme: {} },
  midnight: {
    label: "Midnight",
    theme: {
      colors: { bg: "#0b0b0f", surface: "#16161d", text: "#f5f5f7", muted: "#9a9aa5", accent: "#7c5cff", accentText: "#ffffff" },
      headingFont: "spacegrotesk",
      bodyFont: "inter",
      buttonShape: "pill",
      cardShape: "soft",
    },
  },
  editorial: {
    label: "Editorial",
    theme: {
      colors: { bg: "#faf7f2", surface: "#ffffff", text: "#1c1917", muted: "#78716c", accent: "#1c1917", accentText: "#faf7f2" },
      headingFont: "playfair",
      bodyFont: "lora",
      buttonShape: "square",
      cardShape: "square",
      cardBorder: true,
      cardShadow: false,
    },
  },
  sunset: {
    label: "Sunset",
    theme: {
      colors: { bg: "#fff7ed", surface: "#ffffff", text: "#1f1410", muted: "#7c5a4a", accent: "#ea580c", accentText: "#ffffff" },
      bgGradient: "linear-gradient(180deg, #fff1e6 0%, #ffe4d6 100%)",
      headingFont: "fraunces",
      bodyFont: "dmsans",
      buttonShape: "pill",
      cardShape: "soft",
    },
  },
  neon: {
    label: "Neon",
    theme: {
      colors: { bg: "#041014", surface: "#0b1f26", text: "#e6fffb", muted: "#7fb3ad", accent: "#00e5c3", accentText: "#041014" },
      headingFont: "mono",
      bodyFont: "spacegrotesk",
      buttonShape: "square",
      cardShape: "square",
      cardBorder: true,
      cardShadow: false,
      layout: "grid",
    },
  },
  blush: {
    label: "Blush",
    theme: {
      colors: { bg: "#fff5f7", surface: "#ffffff", text: "#3b1f28", muted: "#8a6470", accent: "#d63d6c", accentText: "#ffffff" },
      headingFont: "poppins",
      bodyFont: "poppins",
      buttonShape: "pill",
      cardShape: "soft",
    },
  },
};

/** CSS variable map for the storefront root element. */
export function themeToCssVars(t: ResolvedTheme): Record<string, string> {
  const radius = { square: "4px", rounded: "12px", soft: "20px" } as const;
  const btnRadius = { square: "6px", rounded: "10px", pill: "999px" } as const;
  return {
    "--sf-bg": t.colors.bg,
    "--sf-surface": t.colors.surface,
    "--sf-text": t.colors.text,
    "--sf-muted": t.colors.muted,
    "--sf-accent": t.colors.accent,
    "--sf-accent-text": t.colors.accentText,
    "--sf-heading-font": FONTS[t.headingFont].css,
    "--sf-body-font": FONTS[t.bodyFont].css,
    "--sf-card-radius": radius[t.cardShape],
    "--sf-btn-radius": btnRadius[t.buttonShape],
    "--sf-card-border": t.cardBorder ? "1px solid color-mix(in srgb, var(--sf-text) 12%, transparent)" : "none",
    "--sf-card-shadow": t.cardShadow ? "0 4px 24px -8px rgba(0,0,0,.18)" : "none",
    "--sf-bg-gradient": t.bgGradient ?? "none",
    "--sf-bg-overlay": String(t.bgOverlay),
  };
}

export function googleFontsHref(t: ResolvedTheme): string {
  const fams = Array.from(new Set([FONTS[t.headingFont].google, FONTS[t.bodyFont].google]));
  return `https://fonts.googleapis.com/css2?${fams.map((f) => `family=${f}`).join("&")}&display=swap`;
}
