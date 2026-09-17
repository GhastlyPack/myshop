import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Compact "Pro feature" lock shown in place of an editor section for Basic
 * sellers. Server-safe (no hooks), so it works inside client and server
 * components alike. Links to the billing page with the feature that was hit.
 */
export function ProLock({ feature, title, description }: { feature: string; title: string; description?: string }) {
  return (
    <section className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-dashed bg-muted/40 p-4 sm:p-5">
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <Lock className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">{title}</h2>
          <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-background">Pro</span>
        </div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <Button asChild size="sm" variant="outline">
        <Link href={`/app/billing?upgrade=${encodeURIComponent(feature)}`}>Upgrade to Pro</Link>
      </Button>
    </section>
  );
}
