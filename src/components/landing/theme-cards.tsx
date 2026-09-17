import type { CSSProperties } from "react";
import { ChevronRight } from "lucide-react";
import { FONTS, resolveTheme, themeToCssVars, THEME_PRESETS } from "@/lib/theme";

/** Google Fonts stylesheet covering every font a preset uses, so the mini stores render in their real type. */
function presetFontsHref() {
  const fams = new Set<string>();
  for (const { theme } of Object.values(THEME_PRESETS)) {
    const t = resolveTheme(theme);
    fams.add(FONTS[t.headingFont].google);
    fams.add(FONTS[t.bodyFont].google);
  }
  return `https://fonts.googleapis.com/css2?${[...fams].map((f) => `family=${f}`).join("&")}&display=swap`;
}

const NAMES = ["Maya", "Jordan", "The Studio", "Sol & Co.", "Kit", "Lena"];
const SAMPLE = [
  { title: "30-day content calendar", price: "$19" },
  { title: "Preset pack", price: "$9" },
];

/**
 * One mini storefront per theme preset, rendered with the real theme CSS
 * variables and .sf-* classes.
 */
export function ThemeCards() {
  return (
    <>
      <link rel="stylesheet" href={presetFontsHref()} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(THEME_PRESETS).map(([key, preset], i) => {
          const t = resolveTheme(preset.theme);
          const vars = themeToCssVars(t) as CSSProperties;
          return (
            <div key={key} className="ld-theme" style={vars}>
              <div className="flex items-center gap-3">
                <div className="sf-avatar !h-10 !w-10 !shadow-none" data-shape={t.avatarShape} aria-hidden />
                <div className="min-w-0">
                  <div className="sf-heading truncate text-[1rem]">{NAMES[i]}</div>
                  <div className="sf-muted truncate text-[0.75rem]">@{NAMES[i].toLowerCase().replace(/[^a-z]/g, "")}</div>
                </div>
              </div>
              <div className={`mt-4 ${t.layout === "grid" ? "grid grid-cols-2 gap-3" : "flex flex-col gap-3"}`}>
                {SAMPLE.map((s) => (
                  <div key={s.title} className="sf-card">
                    <span className="flex flex-col gap-2 p-3.5">
                      <span className="sf-heading text-[0.85rem] leading-tight">{s.title}</span>
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-[0.8rem] font-semibold">{s.price}</span>
                        <span className="sf-btn sf-btn-sm !gap-1 !px-2.5 !py-1.5 !text-[0.72rem]">
                          Get
                          <ChevronRight size={12} className="sf-card-arrow" />
                        </span>
                      </span>
                    </span>
                  </div>
                ))}
              </div>
              <div className="sf-muted mt-4 text-[0.78rem]">{preset.label}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}
