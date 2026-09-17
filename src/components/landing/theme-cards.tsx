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

const SAMPLE = [
  { title: "30-day content calendar", price: "$19" },
  { title: "Preset pack", price: "$9" },
];

/**
 * One mini storefront per theme preset, rendered with the real theme CSS
 * variables and .sf-* classes. This is the "every store looks like you" proof.
 */
export function ThemeCards() {
  return (
    <>
      <link rel="stylesheet" href={presetFontsHref()} />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {Object.entries(THEME_PRESETS).map(([key, preset], i) => {
          const vars = themeToCssVars(resolveTheme(preset.theme)) as CSSProperties;
          const grid = resolveTheme(preset.theme).layout === "grid";
          return (
            <div key={key} className="ld-theme" style={vars}>
              <div className="flex items-center gap-2.5">
                <div className="sf-avatar !h-9 !w-9 !shadow-none" data-shape={resolveTheme(preset.theme).avatarShape} aria-hidden />
                <div className="min-w-0">
                  <div className="sf-heading truncate text-[0.9rem]">{["Maya", "Jordan", "The Studio", "Sol & Co.", "Kit", "Lena"][i]}</div>
                  <div className="sf-muted truncate text-[0.68rem]">@{["maya", "jordan", "studio", "solandco", "kit", "lena"][i]}</div>
                </div>
              </div>
              <div className={`mt-3 ${grid ? "grid grid-cols-2 gap-2" : "flex flex-col gap-2"}`}>
                {SAMPLE.map((s) => (
                  <div key={s.title} className="sf-card">
                    <span className="flex flex-col gap-1.5 p-2.5">
                      <span className="sf-heading text-[0.72rem] leading-tight">{s.title}</span>
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-[0.7rem] font-semibold">{s.price}</span>
                        <span className="sf-btn sf-btn-sm !gap-1 !px-2 !py-1.5 !text-[0.65rem]">
                          Get
                          <ChevronRight size={11} className="sf-card-arrow" />
                        </span>
                      </span>
                    </span>
                  </div>
                ))}
              </div>
              <div className="sf-muted mt-3 text-[0.68rem] font-medium tracking-[0.12em] uppercase">{preset.label}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}
