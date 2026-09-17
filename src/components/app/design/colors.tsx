"use client";

import { useState } from "react";
import { Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ResolvedTheme } from "@/lib/theme";
import { autoTextColors, normalizeHex } from "./contrast";

type Colors = ResolvedTheme["colors"];
type ColorKey = keyof Colors;

const COLOR_FIELDS: { key: ColorKey; label: string; hint: string }[] = [
  { key: "bg", label: "Background", hint: "Page background" },
  { key: "surface", label: "Surface", hint: "Cards and inputs" },
  { key: "text", label: "Text", hint: "Headings and body" },
  { key: "muted", label: "Muted", hint: "Secondary text" },
  { key: "accent", label: "Accent", hint: "Buttons and links" },
  { key: "accentText", label: "Accent text", hint: "Text on buttons" },
];

/** Native colour picker + hex text input kept in sync. Text commits only once it is a valid hex. */
function ColorField({ id, label, hint, value, onChange }: { id: string; label: string; hint: string; value: string; onChange: (hex: string) => void }) {
  const [text, setText] = useState(value);
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setText(value);
  }
  const valid = normalizeHex(text) !== null;
  const swatch = normalizeHex(value) ?? "#000000";

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-background p-2 pr-3">
      <label className="relative block size-9 shrink-0 cursor-pointer overflow-hidden rounded-md border border-black/10 shadow-inner" style={{ background: swatch }}>
        <span className="sr-only">{label} colour picker</span>
        <input
          type="color"
          value={swatch}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
          aria-label={`${label} picker`}
        />
      </label>
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="block text-xs font-medium">
          {label}
        </label>
        <span className="block truncate text-[11px] text-muted-foreground">{hint}</span>
      </div>
      <input
        id={id}
        value={text}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          const hex = normalizeHex(next);
          if (hex) onChange(hex);
        }}
        onBlur={() => {
          if (!valid) setText(value);
        }}
        spellCheck={false}
        maxLength={7}
        aria-invalid={!valid}
        className="h-7 w-[84px] shrink-0 rounded-md border border-input bg-transparent px-2 font-mono text-xs uppercase outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
      />
    </div>
  );
}

export function ColorControls({ colors, onChange }: { colors: Colors; onChange: (patch: Partial<Colors>) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {COLOR_FIELDS.map((f) => (
          <ColorField key={f.key} id={`color-${f.key}`} label={f.label} hint={f.hint} value={colors[f.key]} onChange={(hex) => onChange({ [f.key]: hex })} />
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2">
        <p className="text-xs text-muted-foreground">Pick text colours that stay readable on your background and accent.</p>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange(autoTextColors(colors.bg, colors.accent))}>
          <Wand2 data-icon="inline-start" />
          Auto text colors
        </Button>
      </div>
    </div>
  );
}
