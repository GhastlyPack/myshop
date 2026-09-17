"use client";

import { Switch } from "@/components/ui/switch";
import type { ResolvedTheme } from "@/lib/theme";
import { ChoiceGroup } from "./choice-group";
import { Field } from "./section";

type ButtonShape = ResolvedTheme["buttonShape"];
type CardShape = ResolvedTheme["cardShape"];
type AvatarShape = ResolvedTheme["avatarShape"];
type AvatarSize = ResolvedTheme["avatarSize"];

const Bar = ({ radius }: { radius: number }) => <span aria-hidden className="block h-4 w-12 bg-current" style={{ borderRadius: radius }} />;
const Tile = ({ radius }: { radius: number }) => <span aria-hidden className="block h-7 w-10 border-2 border-current" style={{ borderRadius: radius }} />;
const Dot = ({ size, radius }: { size: number; radius: number | string }) => <span aria-hidden className="block bg-current" style={{ width: size, height: size, borderRadius: radius }} />;

function ToggleRow({ id, label, hint, checked, onChange }: { id: string; label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2.5">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-xs font-medium">{label}</span>
        <span className="block text-[11px] text-muted-foreground">{hint}</span>
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function ShapeControls({
  theme,
  onChange,
}: {
  theme: Pick<ResolvedTheme, "buttonShape" | "cardShape" | "avatarShape" | "avatarSize" | "cardBorder" | "cardShadow">;
  onChange: (patch: Partial<ResolvedTheme>) => void;
}) {
  return (
    <div className="space-y-5">
      <Field label="Buttons">
        <ChoiceGroup<ButtonShape>
          ariaLabel="Button shape"
          value={theme.buttonShape}
          onChange={(v) => onChange({ buttonShape: v })}
          options={[
            { value: "square", label: "Square", preview: <Bar radius={2} /> },
            { value: "rounded", label: "Rounded", preview: <Bar radius={6} /> },
            { value: "pill", label: "Pill", preview: <Bar radius={999} /> },
          ]}
        />
      </Field>
      <Field label="Cards">
        <ChoiceGroup<CardShape>
          ariaLabel="Card shape"
          value={theme.cardShape}
          onChange={(v) => onChange({ cardShape: v })}
          options={[
            { value: "square", label: "Square", preview: <Tile radius={2} /> },
            { value: "rounded", label: "Rounded", preview: <Tile radius={6} /> },
            { value: "soft", label: "Soft", preview: <Tile radius={11} /> },
          ]}
        />
      </Field>
      <div className="grid gap-2 sm:grid-cols-2">
        <ToggleRow id="card-border" label="Card border" hint="Thin outline around cards" checked={theme.cardBorder} onChange={(v) => onChange({ cardBorder: v })} />
        <ToggleRow id="card-shadow" label="Card shadow" hint="Soft drop shadow" checked={theme.cardShadow} onChange={(v) => onChange({ cardShadow: v })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Avatar shape">
          <ChoiceGroup<AvatarShape>
            ariaLabel="Avatar shape"
            value={theme.avatarShape}
            onChange={(v) => onChange({ avatarShape: v })}
            options={[
              { value: "circle", label: "Circle", preview: <Dot size={22} radius="50%" /> },
              { value: "rounded", label: "Rounded", preview: <Dot size={22} radius={6} /> },
              { value: "square", label: "Square", preview: <Dot size={22} radius={2} /> },
            ]}
          />
        </Field>
        <Field label="Avatar size">
          <ChoiceGroup<AvatarSize>
            ariaLabel="Avatar size"
            value={theme.avatarSize}
            onChange={(v) => onChange({ avatarSize: v })}
            options={[
              { value: "sm", label: "Small", preview: <Dot size={14} radius="50%" /> },
              { value: "md", label: "Medium", preview: <Dot size={20} radius="50%" /> },
              { value: "lg", label: "Large", preview: <Dot size={28} radius="50%" /> },
            ]}
          />
        </Field>
      </div>
    </div>
  );
}
