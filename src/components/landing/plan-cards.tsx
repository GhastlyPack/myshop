import Link from "next/link";
import { Check } from "lucide-react";
import { keepPercent, PLANS, ROADMAP, TRIAL } from "@/lib/plans";

/**
 * The two plan cards. Static, no toggle: both prices are visible so nothing hides behind a click.
 * Pro is the dark card; CTAs are pinned to the bottom so they sit on one row.
 */
export function PlanCards({ ctaHref }: { ctaHref: string }) {
  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        {PLANS.map((p) => {
          const dark = Boolean(p.highlight);
          const muted = dark ? "text-white/60" : "ld-muted";
          const line = dark ? "border-white/15" : "ld-line";
          return (
            <div key={p.key} className={`flex flex-col rounded-2xl border p-7 sm:p-9 ${dark ? "border-transparent bg-[var(--ld-ink)] text-white" : "border-[var(--ld-line)] bg-white"}`}>
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-2xl font-semibold tracking-tight">{p.name}</h3>
                {dark && <span className="rounded-full bg-[var(--ld-orange)] px-3 py-1 text-xs font-semibold text-white">Most creators</span>}
              </div>
              <p className={`mt-1.5 text-[0.95rem] ${muted}`}>{p.tagline}</p>

              <div className="mt-8 flex flex-wrap items-end gap-x-3 gap-y-2">
                <div className="flex items-baseline gap-1">
                  <span className="ld-heading text-[3.5rem] leading-none">${p.monthly}</span>
                  <span className={`text-base ${muted}`}>/month</span>
                </div>
                <span className={`mb-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${line} ${muted}`}>${p.annual}/year · two months free</span>
              </div>

              <div className={`mt-7 border-y py-4 ${line}`}>
                <div className="text-lg font-semibold">You keep {keepPercent(p)}% of every sale</div>
                <div className={`mt-0.5 text-sm ${muted}`}>{p.feePercent ? `${p.feePercent}% platform fee per sale` : "No platform fee"}</div>
              </div>

              <ul className="mt-7 space-y-3 text-[0.95rem]">
                {p.key === "pro" && <li className={`text-sm font-medium ${muted}`}>Everything in Basic, plus</li>}
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <Check size={18} strokeWidth={2.5} className="mt-0.5 shrink-0 text-[var(--ld-orange)]" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {p.key === "pro" && (
                <p className={`mt-6 text-sm leading-relaxed ${muted}`}>
                  <span className="font-semibold text-white">Coming soon to Pro:</span> {ROADMAP.join(", ").replace(/, ([^,]*)$/, ", and $1").toLowerCase()}.
                </p>
              )}

              <div className="mt-auto pt-9">
                <Link href={ctaHref} className={`ld-btn w-full ${dark ? "ld-btn-primary" : "ld-btn-ink"}`}>
                  Start free trial
                </Link>
                <p className={`mt-3 text-center text-xs ${muted}`}>{TRIAL}</p>
              </div>
            </div>
          );
        })}
      </div>
      <p className="ld-muted mt-5 text-center text-sm">Stripe’s card processing fee applies to paid sales on both plans and goes to Stripe, not us.</p>
    </div>
  );
}
