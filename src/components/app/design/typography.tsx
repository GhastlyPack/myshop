"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FONTS, type FontKey } from "@/lib/theme";
import { Field } from "./section";

/** One stylesheet for every editor font so each option renders in its own face. */
export const ALL_FONTS_HREF = `https://fonts.googleapis.com/css2?${Object.values(FONTS)
  .map((f) => `family=${f.google}`)
  .join("&")}&display=swap`;

function FontSelect({ id, value, onChange }: { id: string; value: FontKey; onChange: (v: FontKey) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as FontKey)}>
      <SelectTrigger id={id} className="w-full" style={{ fontFamily: FONTS[value].css }}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper">
        {(Object.keys(FONTS) as FontKey[]).map((key) => (
          <SelectItem key={key} value={key} style={{ fontFamily: FONTS[key].css }} className="text-[15px]">
            {FONTS[key].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function TypographyControls({
  headingFont,
  bodyFont,
  onChange,
}: {
  headingFont: FontKey;
  bodyFont: FontKey;
  onChange: (patch: { headingFont?: FontKey; bodyFont?: FontKey }) => void;
}) {
  return (
    <div className="space-y-4">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={ALL_FONTS_HREF} precedence="default" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Heading font" htmlFor="heading-font">
          <FontSelect id="heading-font" value={headingFont} onChange={(v) => onChange({ headingFont: v })} />
        </Field>
        <Field label="Body font" htmlFor="body-font">
          <FontSelect id="body-font" value={bodyFont} onChange={(v) => onChange({ bodyFont: v })} />
        </Field>
      </div>
      <div className="rounded-lg border bg-muted/40 px-4 py-3">
        <p className="text-lg leading-tight font-semibold" style={{ fontFamily: FONTS[headingFont].css }}>
          Your store, your look
        </p>
        <p className="mt-1 text-sm text-muted-foreground" style={{ fontFamily: FONTS[bodyFont].css }}>
          Body text shows up in product descriptions, bios and buttons.
        </p>
      </div>
    </div>
  );
}
