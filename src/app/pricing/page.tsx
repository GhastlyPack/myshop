import type { Metadata } from "next";
import Link from "next/link";
import { PlanCards } from "@/components/landing/plan-cards";
import { MarketingShell } from "@/components/landing/shell";
import { getCurrentUser, loginPath } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Pricing",
  description: "visitmy.shop plans: Basic at $9 a month with a 5% fee, Pro at $49 a month with a 0% fee. 7-day free trial with full Pro access.",
  alternates: { canonical: "/pricing" },
};

export default async function PricingPage() {
  const user = await getCurrentUser();
  const ctaHref = user ? "/app" : loginPath("/app");
  return (
    <MarketingShell>
      <main className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
        <div className="max-w-2xl">
          <h1 className="ld-heading text-[2.6rem] sm:text-[3.4rem]">Start at $9. Keep up to 100%.</h1>
          <p className="ld-muted mt-6 text-xl leading-relaxed">
            Two plans. Basic keeps 95% of each sale. When your sales grow, Pro pays for itself by dropping the fee to zero. Every account starts with 7 days
            of full Pro access.
          </p>
        </div>
        <div className="mt-12">
          <PlanCards ctaHref={ctaHref} />
        </div>

        <div className="ld-prose mt-20 max-w-3xl">
          <h2>When Pro pays for itself</h2>
          <p>
            Basic costs $9 a month plus 5% of sales. Pro costs $49 a month with no fee. The break-even is $800 a month in sales: below that, Basic is
            cheaper; above it, Pro keeps more of your money every month. Most creators start on Basic and switch once a product takes off.
          </p>
          <h2>Cut Stan in half, keep 100% of your sales</h2>
          <p>
            Stan charges $29 a month to start and $99 a month for its top plan. visitmy.shop is $9 and $49: a third of their entry price and half their
            top price, with a full design editor, buyer download library, and reviews, and a 0% fee on Pro. See the{" "}
            <Link href="/compare/stan-store">Stan store comparison</Link>.
          </p>
          <h2>Questions</h2>
          <p>
            What counts as a sale, how refunds affect the fee, and what happens when the trial ends are answered in the <Link href="/faq">FAQ</Link>.
            Anything else: hello@visitmy.shop.
          </p>
        </div>
      </main>
    </MarketingShell>
  );
}
