import { readFile } from "node:fs/promises";

/**
 * Shared pieces for the ImageResponse routes (favicon, apple icon, OG cards).
 * Satori (the renderer behind next/og) supports a CSS subset: flexbox, absolute
 * positioning, border-radius, and <img>. No SVG paths with arcs in some builds,
 * so the awning mark is built from divs.
 */
export const BRAND = {
  ink: "#111111",
  cream: "#FAF7F2",
  white: "#FFFFFF",
  orange: "#F4611E",
  muted: "#6B7280",
  border: "#D4D4D8",
} as const;

export const OG_SIZE = { width: 1200, height: 630 };

let fontsCache: Promise<{ manrope: ArrayBuffer; interSemi: ArrayBuffer; inter: ArrayBuffer }> | null = null;
export function loadFonts() {
  if (!fontsCache) {
    fontsCache = (async () => {
      const [manrope, interSemi, inter] = await Promise.all([
        readFile(new URL("../assets/fonts/Manrope-ExtraBold.ttf", import.meta.url)),
        readFile(new URL("../assets/fonts/Inter-SemiBold.ttf", import.meta.url)),
        readFile(new URL("../assets/fonts/Inter-Regular.ttf", import.meta.url)),
      ]);
      const ab = (b: Buffer) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
      return { manrope: ab(manrope), interSemi: ab(interSemi), inter: ab(inter) };
    })();
  }
  return fontsCache;
}

export async function ogFonts() {
  const f = await loadFonts();
  return [
    { name: "Manrope", data: f.manrope, weight: 800 as const, style: "normal" as const },
    { name: "Inter", data: f.interSemi, weight: 600 as const, style: "normal" as const },
    { name: "Inter", data: f.inter, weight: 400 as const, style: "normal" as const },
  ];
}

/** The awning mark from divs: canopy with rounded top + three scallops. `width` in px. */
export function Awning({ width, color = BRAND.orange }: { width: number; color?: string }) {
  const u = width / 24;
  const scallop = 8 * u;
  return (
    <div style={{ position: "relative", width, height: 10.5 * u, display: "flex" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width, height: 6.5 * u, background: color, borderTopLeftRadius: 3 * u, borderTopRightRadius: 3 * u }} />
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ position: "absolute", left: i * scallop, top: 2.5 * u, width: scallop, height: scallop, background: color, borderRadius: scallop }} />
      ))}
    </div>
  );
}

/** Wordmark for satori: "visitmy" + mark + "shop", mark seated on the baseline. */
export function WordmarkOG({ size, color = BRAND.ink, markColor = BRAND.orange }: { size: number; color?: string; markColor?: string }) {
  const markW = size * 0.34;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", fontFamily: "Manrope", fontWeight: 800, fontSize: size, letterSpacing: -size * 0.03, color, lineHeight: 1 }}>
      <span>visitmy</span>
      <div style={{ display: "flex", margin: `0 ${size * 0.06}px ${size * 0.2}px` }}>
        <Awning width={markW} color={markColor} />
      </div>
      <span>shop</span>
    </div>
  );
}
