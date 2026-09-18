import type { Metadata } from "next";
import Link from "next/link";
import { PlanCards } from "@/components/landing/plan-cards";
import { MarketingShell } from "@/components/landing/shell";
import { getCurrentUser, loginPath } from "@/lib/auth";
import { COMPETITORS, PLANS } from "@/lib/plans";

const basic = PLANS[0];
const pro = PLANS[1];

export const metadata: Metadata = {
  title: "Pricing",
  description: `visitmy.shop plans: Basic at $${basic.monthly} a month with a ${basic.feePercent}% fee, Pro at $${pro.monthly} a month with a 0% fee. Design your store free, add a card when you publish, 7 days of Pro.`,
  alternates: { canonical: "/pricing" },
};

/** What each plan includes, in words. Both plans share the first block. */
const TABLE: [string, string, string][] = [
  ["Storefront at visitmy.shop/you", "Yes", "Yes"],
  ["Digital products, links, lead magnets", "Unlimited", "Unlimited"],
  ["Instant delivery and the buyer library", "Yes", "Yes"],
  ["Reviews from buyers", "Yes", "Yes"],
  ["Fee on sales", `${basic.feePercent}%`, "0%"],
  ["Store design", "Preset themes", "Full editor: fonts, colors, layout, background"],
  ["visitmy.shop credit on your store", "Shown", "Removable"],
  ["Analytics", "Views, clicks, sales", "Plus sources and per-card conversion"],
  ["Booking calls", "No", "Google Calendar + Meet, questionnaire, prep doc"],
  ["Instagram keyword auto-replies", "No", "Yes"],
  ["Pricing tiers, pay what you want", "No", "Yes"],
  ["Order bumps", "No", "Up to 5 per product"],
  ["Discount codes, limited quantity", "No", "Yes"],
  ["Custom checkout questions", "No", "Yes"],
  ["Pixels", "No", "Meta, Google, TikTok, plus Meta Conversions API"],
  ["Team access", "No", "Yes"],
];

const TRIAL_STEPS: [string, string][] = [
  ["Design it free", "Claim your link and build the whole store with no card on file. Presets, products, copy, all of it."],
  ["Add a card when you publish", "The first time you publish, upload a file, or switch on a Pro feature, you add a card. That starts 7 days of full Pro, free."],
  ["Then it's your call", `When the trial ends you're on Basic at $${basic.monthly} unless you upgrade. Upgrade before it ends and take 5% off Pro for your first 12 months.`],
];

export default async function PricingPage() {
  const user = await getCurrentUser();
  const ctaHref = user ? "/app" : loginPath("/app");
  const breakEven = Math.round((pro.monthly - basic.monthly) / (basic.feePercent / 100));
  return (
    <MarketingShell>
      <main className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
        <div className="max-w-2xl">
          <h1 className="ld-heading text-[2.6rem] sm:text-[3.4rem]">Start at ${basic.monthly}. Keep up to 100%.</h1>
          <p className="ld-muted mt-6 text-xl leading-relaxed">
            Two plans. Basic keeps {100 - basic.feePercent}% of each sale. When your sales grow, Pro pays for itself by dropping the fee to zero. Design your store before you pay a cent.
          </p>
        </div>
        <div className="mt-12">
          <PlanCards ctaHref={ctaHref} />
        </div>

        {/* ---------- how the trial works ---------- */}
        <section className="mt-20 lg:mt-28">
          <h2 className="ld-heading text-[2rem] sm:text-[2.6rem]">How the trial works.</h2>
          <div className="ld-cols mt-10">
            {TRIAL_STEPS.map(([title, body]) => (
              <div key={title}>
                <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
                <p className="ld-muted mt-3 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- plan table ---------- */}
        <section className="mt-20 lg:mt-28">
          <h2 className="ld-heading text-[2rem] sm:text-[2.6rem]">Basic and Pro, side by side.</h2>
          <div className="ld-card mt-10 overflow-x-auto">
            <table className="ld-table ld-table-wide w-full min-w-[640px]">
              <thead>
                <tr>
                  <th scope="col" />
                  <th scope="col">
                    Basic <span className="ld-muted font-normal">${basic.monthly}/mo</span>
                  </th>
                  <th scope="col">
                    Pro <span className="ld-muted font-normal">${pro.monthly}/mo</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {TABLE.map(([label, b, p]) => (
                  <tr key={label}>
                    <th scope="row" className="font-medium">
                      {label}
                    </th>
                    <td>{b}</td>
                    <td className="ld-us">{p}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="ld-muted mt-4 text-sm">Stripe&apos;s card processing fee applies to paid sales on both plans and goes to Stripe, not us.</p>
        </section>

        {/* ---------- the two numbers people ask about ---------- */}
        <section className="mt-20 grid gap-5 lg:mt-28 lg:grid-cols-2">
          <div className="ld-card p-7 sm:p-9">
            <div className="ld-heading text-[2.6rem]">${breakEven.toLocaleString()} a month</div>
            <h2 className="mt-2 text-lg font-semibold">Where Pro starts paying for itself</h2>
            <p className="ld-muted mt-3 leading-relaxed">
              Basic is ${basic.monthly} plus {basic.feePercent}% of sales. Pro is ${pro.monthly} with no fee. Below ${breakEven.toLocaleString()} in monthly sales Basic is cheaper; above it Pro keeps more every month. Most
              creators start on Basic and switch once a product takes off.
            </p>
          </div>
          <div className="ld-card p-7 sm:p-9">
            <div className="ld-heading text-[2.6rem]">
              ${basic.monthly} and ${pro.monthly} <span className="ld-muted text-[1.4rem] font-semibold">vs ${COMPETITORS.stan.entry} and ${COMPETITORS.stan.top}</span>
            </div>
            <h2 className="mt-2 text-lg font-semibold">Against Stan</h2>
            <p className="ld-muted mt-3 leading-relaxed">
              A third of Stan&apos;s entry price and half its top price, with booking calls, pixels, and branding removal on Pro instead of a ${COMPETITORS.stan.top} tier, plus pricing tiers and
              multiple order bumps Stan doesn&apos;t have. Stan charges 0% on both plans; our Basic keeps {basic.feePercent}% and Pro keeps nothing.{" "}
              <Link href="/compare/stan-store" className="text-[var(--ld-orange-ink)] underline underline-offset-4">
                The full comparison
              </Link>
              .
            </p>
          </div>
        </section>

        <p className="ld-muted mt-16 max-w-3xl leading-relaxed">
          What counts as a sale, how refunds affect the fee, and what happens when the trial ends are answered in the{" "}
          <Link href="/faq" className="text-[var(--ld-orange-ink)] underline underline-offset-4">
            FAQ
          </Link>
          . Anything else: hello@visitmy.shop.
        </p>
      </main>
    </MarketingShell>
  );
}
