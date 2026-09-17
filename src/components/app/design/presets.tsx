"use client";

import { resolveTheme, THEME_PRESETS } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** Tiny storefront thumbnail rendered from a preset's colours. */
function PresetSwatch({ presetKey }: { presetKey: string }) {
  const t = resolveTheme(THEME_PRESETS[presetKey].theme);
  const radius = { square: 1, rounded: 3, soft: 5 }[t.cardShape];
  const btnRadius = { square: 1, rounded: 3, pill: 999 }[t.buttonShape];
  return (
    <span
      aria-hidden
      className="flex h-12 w-full flex-col items-center gap-1 overflow-hidden rounded-md border border-black/5 p-1.5"
      style={{ background: t.bgGradient ?? t.colors.bg }}
    >
      <span className="h-1.5 w-6 rounded-full" style={{ background: t.colors.text }} />
      <span className="flex w-full flex-col gap-1">
        {[0, 1].map((i) => (
          <span key={i} className="flex h-2.5 w-full items-center justify-end px-1" style={{ background: t.colors.surface, borderRadius: radius, border: t.cardBorder ? `1px solid ${t.colors.muted}40` : undefined }}>
            <span className="h-1 w-3" style={{ background: t.colors.accent, borderRadius: btnRadius }} />
          </span>
        ))}
      </span>
    </span>
  );
}

export function PresetPicker({ value, onChange }: { value: string | undefined; onChange: (key: string) => void }) {
  return (
    <div role="radiogroup" aria-label="Theme preset" className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2">
      {Object.entries(THEME_PRESETS).map(([key, preset]) => {
        const selected = (value ?? "clean") === key;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(key)}
            className={cn(
              "flex flex-col gap-1.5 rounded-lg border bg-background p-1.5 text-left text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              selected ? "border-foreground ring-1 ring-foreground" : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
            )}
          >
            <PresetSwatch presetKey={key} />
            <span className="px-0.5">{preset.label}</span>
          </button>
        );
      })}
    </div>
  );
}
