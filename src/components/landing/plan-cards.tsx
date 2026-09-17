import Link from "next/link";
import { keepPercent, PLANS, ROADMAP, TRIAL } from "@/lib/plans";

/** The two plan cards. Static, no toggle: both prices are visible so nothing hides behind a click. */
export function PlanCards({ ctaHref }: { ctaHref: string }) {
  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2">
        {PLANS.map((p) => (
          <div key={p.key} className={`ld-card flex flex-col p-7 sm:p-8 ${p.highlight ? "border-[var(--ld-ink)]" : ""}`}>
            <div className="flex items-baseline justify-between">
              <h3 className="text-xl font-semibold tracking-tight">{p.name}</h3>
              {p.highlight && <span className="ld-muted text-xs font-semibold tracking-[0.12em] uppercase">Most creators</span>}
            </div>
            <p className="ld-muted mt-1 text-sm">{p.tagline}</p>
            <div className="mt-6 flex items-baseline gap-1.5">
              <span className="ld-heading text-[3rem]">${p.monthly}</span>
              <span className="ld-muted text-sm">/month</span>
            </div>
            <p className="ld-muted mt-1 text-sm">
              or ${p.annual}/year, two months free
            </p>
            <p className={`mt-4 rounded-lg px-3.5 py-2.5 text-sm font-medium ${p.feePercent === 0 ? "bg-[var(--ld-ink)] text-white" : "bg-[var(--ld-tint)]"}`}>
              Keep {keepPercent(p)}% of every sale{p.feePercent ? ` (${p.feePercent}% fee)` : " (0% fee)"}
            </p>
            <ul className="mt-6 space-y-2.5 text-[0.95rem]">
              {p.key === "pro" && <li className="ld-muted">Everything in Basic, plus:</li>}
              {p.features.map((f) => (
                <li key={f} className="flex gap-2.5">
                  <span className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ld-orange)]" aria-hidden />
                  {f}
                </li>
              ))}
            </ul>
            {p.key === "pro" && (
              <div className="mt-6 border-t ld-line pt-5">
                <div className="ld-muted text-xs font-semibold tracking-[0.12em] uppercase">Coming soon to Pro</div>
                <ul className="ld-muted mt-2 space-y-1.5 text-sm">
                  {ROADMAP.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
            <Link href={ctaHref} className={`ld-btn mt-8 ${p.highlight ? "ld-btn-primary" : "ld-btn-ink"}`}>
              Start free trial
            </Link>
          </div>
        ))}
      </div>
      <p className="ld-muted mt-5 text-sm">{TRIAL} Stripe’s card processing fee applies to paid sales on both plans and goes to Stripe.</p>
    </div>
  );
}
