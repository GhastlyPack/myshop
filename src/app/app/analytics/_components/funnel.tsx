import { ArrowDown } from "lucide-react";

export type FunnelStep = { label: string; value: number; hint?: string };

const pct = (n: number, d: number) => (d > 0 ? `${((n / d) * 100).toFixed(n / d >= 0.1 ? 0 : 1)}%` : "0%");

/** Vertical conversion funnel. Bars are proportional to the first step; the badge between steps is step-over-step conversion. */
export function Funnel({ steps }: { steps: FunnelStep[] }) {
  const first = steps[0]?.value ?? 0;
  return (
    <ol className="space-y-1">
      {steps.map((s, i) => {
        const prev = i > 0 ? steps[i - 1].value : null;
        const widthPct = first > 0 ? Math.max(2, (s.value / first) * 100) : 0;
        return (
          <li key={s.label}>
            {prev !== null && (
              <div className="flex items-center gap-1.5 py-1 pl-1 text-xs text-muted-foreground">
                <ArrowDown className="size-3" aria-hidden />
                <span className="font-medium tabular-nums text-foreground">{pct(s.value, prev)}</span> continue
              </div>
            )}
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">{s.label}</div>
                {s.hint && <div className="text-xs text-muted-foreground">{s.hint}</div>}
                <div className="mt-1 h-2 w-full overflow-hidden rounded-sm bg-muted">
                  <div className="h-full rounded-sm bg-foreground/80" style={{ width: `${widthPct}%` }} />
                </div>
              </div>
              <div className="w-16 text-right text-sm font-semibold tabular-nums">{s.value.toLocaleString("en-US")}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
