import type { Theme } from "@/lib/theme";

/** Theme for the mockup stores on the lander: white cards on the site's blue-grey tint, orange accent. */
export const LANDING_STORE_THEME: Theme = {
  colors: { bg: "#f1f4f8", surface: "#ffffff", text: "#111111", muted: "#667085", accent: "#f4611e", accentText: "#ffffff" },
  headingFont: "fraunces",
  bodyFont: "dmsans",
  buttonShape: "pill",
  cardShape: "soft",
  cardBorder: true,
  cardShadow: false,
};
