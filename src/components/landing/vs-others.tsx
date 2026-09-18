import Link from "next/link";
import { COMPETITORS, PLANS } from "@/lib/plans";

/** Six rows against the big-name creator store, without naming it. Shared by the lander and /features. */
export function VsOthers() {
  const pro = PLANS[1];
  const stan = COMPETITORS.stan;
  const rows: [string, string, string][] = [
    ["Monthly price", `$${PLANS[0].monthly} and $${pro.monthly}`, `$${stan.entry} and $${stan.top}`],
    ["Booking calls with Google Calendar + Meet", `Pro, $${pro.monthly}`, `$${stan.top} plan`],
    ["Your own Meta, Google, TikTok pixels", `Pro, $${pro.monthly}`, `$${stan.top} plan`],
    ["Order bumps per product", "Up to 5", "1"],
    ["Pricing tiers, pay what you want", "Yes", "No"],
    ["Fee on sales", "0% on Pro", "0%"],
  ];
  return (
    <section className="border-t ld-line bg-white">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-16">
          <div>
            <h2 className="ld-heading text-[2.2rem] sm:text-[2.8rem]">Half the price of the big creator stores. More of the features.</h2>
            <p className="ld-muted mt-5 text-lg leading-relaxed">
              The other guys put booking calls, pixels, and branding removal on a ${stan.top} plan. Here they&apos;re on Pro at ${pro.monthly}, with a 0% fee. Pricing tiers, pay what you
              want, and multiple order bumps you won&apos;t find there at all.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/compare" className="ld-btn ld-btn-ink">
                See the full comparison
              </Link>
              <Link href="/pricing" className="ld-btn ld-btn-ghost">
                See pricing
              </Link>
            </div>
          </div>
          <dl className="divide-y ld-line rounded-2xl border ld-line">
            <div className="grid grid-cols-[1fr_auto_auto] items-baseline gap-4 px-5 pt-4 pb-2 text-xs font-semibold">
              <dt />
              <dd className="ld-orange">visitmy.shop</dd>
              <dd className="ld-muted w-24 text-right">The other guys</dd>
            </div>
            {rows.map(([label, us, them]) => (
              <div key={label} className="grid grid-cols-[1fr_auto_auto] items-baseline gap-4 px-5 py-4 text-sm">
                <dt className="font-medium">{label}</dt>
                <dd className="ld-orange font-semibold">{us}</dd>
                <dd className="ld-muted w-24 text-right">{them}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
