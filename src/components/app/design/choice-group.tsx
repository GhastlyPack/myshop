"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Choice<T extends string> = { value: T; label: string; preview?: ReactNode };

/** Segmented picker rendered as a grid of tiles with an optional illustration. */
export function ChoiceGroup<T extends string>({
  value,
  options,
  onChange,
  columns = 3,
  ariaLabel,
}: {
  value: T;
  options: Choice<T>[];
  onChange: (value: T) => void;
  columns?: 2 | 3 | 4;
  ariaLabel: string;
}) {
  const cols = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" }[columns];
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn("grid gap-2", cols)}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg border bg-background px-2 py-2.5 text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              selected ? "border-foreground ring-1 ring-foreground" : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
            )}
          >
            {opt.preview && <span className="flex h-8 w-full items-center justify-center">{opt.preview}</span>}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
