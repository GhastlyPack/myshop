"use client";

import { Switch } from "@/components/ui/switch";

export function BrandingControls({ showBranding, onChange }: { showBranding: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2.5">
      <label htmlFor="show-branding" className="min-w-0 cursor-pointer">
        <span className="block text-xs font-medium">Show &ldquo;Made with visitmy.shop&rdquo;</span>
        <span className="block text-[11px] text-muted-foreground">A small credit in your store footer.</span>
      </label>
      <Switch id="show-branding" checked={showBranding} onCheckedChange={onChange} />
    </div>
  );
}
