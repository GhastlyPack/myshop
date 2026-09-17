/** Small colour helpers for the editor: hex parsing, WCAG luminance, mixing. */

export function normalizeHex(input: string): string | null {
  const s = input.trim().replace(/^#/, "").toLowerCase();
  if (/^[0-9a-f]{6}$/.test(s)) return `#${s}`;
  if (/^[0-9a-f]{3}$/.test(s)) return `#${s[0]}${s[0]}${s[1]}${s[1]}${s[2]}${s[2]}`;
  return null;
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = normalizeHex(hex) ?? "#000000";
  return [parseInt(n.slice(1, 3), 16), parseInt(n.slice(3, 5), 16), parseInt(n.slice(5, 7), 16)];
}

export function rgbToHex([r, g, b]: [number, number, number]): string {
  const c = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Relative luminance per WCAG 2.x. */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Mix `a` toward `b` by `t` in sRGB. t=0 → a, t=1 → b. */
export function mix(a: string, b: string, t: number): string {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  return rgbToHex([ra[0] + (rb[0] - ra[0]) * t, ra[1] + (rb[1] - ra[1]) * t, ra[2] + (rb[2] - ra[2]) * t]);
}

const DARK = "#111111";
const LIGHT = "#f5f5f7";

/**
 * Whichever of near-black / near-white reads best on `bg`. With `preferLightAbove`,
 * white wins as soon as it clears that ratio (buttons look better with white text
 * on saturated accents even when black scores marginally higher).
 */
export function readableOn(bg: string, preferLightAbove?: number): string {
  const light = contrastRatio(bg, LIGHT);
  if (preferLightAbove !== undefined && light >= preferLightAbove) return "#ffffff";
  return contrastRatio(bg, DARK) >= light ? DARK : LIGHT;
}

/** Text, muted and accent-text colours that stay legible on the given bg / accent. */
export function autoTextColors(bg: string, accent: string): { text: string; muted: string; accentText: string } {
  const text = readableOn(bg);
  const muted = mix(text, bg, 0.45);
  const accentText = readableOn(accent, 3.5);
  return { text, muted, accentText };
}
