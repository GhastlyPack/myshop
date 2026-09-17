"use client";

import type { ResolvedTheme } from "@/lib/theme";
import { ChoiceGroup } from "./choice-group";

type Layout = ResolvedTheme["layout"];

const icon = "h-7 w-9 text-current";

const ListIcon = (
  <svg viewBox="0 0 36 28" className={icon} fill="none" aria-hidden>
    <rect x="4" y="3" width="28" height="6" rx="1.5" fill="currentColor" opacity=".9" />
    <rect x="4" y="11" width="28" height="6" rx="1.5" fill="currentColor" opacity=".55" />
    <rect x="4" y="19" width="28" height="6" rx="1.5" fill="currentColor" opacity=".3" />
  </svg>
);

const GridIcon = (
  <svg viewBox="0 0 36 28" className={icon} fill="none" aria-hidden>
    <rect x="4" y="3" width="13" height="10" rx="1.5" fill="currentColor" opacity=".9" />
    <rect x="19" y="3" width="13" height="10" rx="1.5" fill="currentColor" opacity=".55" />
    <rect x="4" y="15" width="13" height="10" rx="1.5" fill="currentColor" opacity=".55" />
    <rect x="19" y="15" width="13" height="10" rx="1.5" fill="currentColor" opacity=".3" />
  </svg>
);

const HeroIcon = (
  <svg viewBox="0 0 36 28" className={icon} fill="none" aria-hidden>
    <rect x="4" y="3" width="28" height="13" rx="1.5" fill="currentColor" opacity=".9" />
    <rect x="4" y="18" width="13" height="7" rx="1.5" fill="currentColor" opacity=".4" />
    <rect x="19" y="18" width="13" height="7" rx="1.5" fill="currentColor" opacity=".4" />
  </svg>
);

export function LayoutPicker({ value, onChange }: { value: Layout; onChange: (v: Layout) => void }) {
  return (
    <ChoiceGroup<Layout>
      ariaLabel="Product layout"
      value={value}
      onChange={onChange}
      options={[
        { value: "list", label: "List", preview: ListIcon },
        { value: "grid", label: "Grid", preview: GridIcon },
        { value: "hero", label: "Hero", preview: HeroIcon },
      ]}
    />
  );
}
