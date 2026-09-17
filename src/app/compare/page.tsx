import type { Metadata } from "next";
import Link from "next/link";
import { Article, MarketingShell } from "@/components/landing/shell";

export const metadata: Metadata = {
  title: "Compare visitmy.shop",
  description: "How visitmy.shop compares with Stan store and Linktree for selling digital products from your bio.",
  alternates: { canonical: "/compare" },
};

export default function ComparePage() {
  return (
    <MarketingShell>
      <Article title="How visitmy.shop compares." intro="Honest, specific comparisons. We say what the other tools do well too.">
        <ul>
          <li>
            <Link href="/compare/stan-store">visitmy.shop vs Stan store</Link>: design control, product URLs, checkout fields, buyer library, reviews, and pricing.
          </li>
          <li>
            <Link href="/compare/linktree">visitmy.shop vs Linktree</Link>: a link page versus a store, and what that means for selling files.
          </li>
        </ul>
        <p>Compared against published plans in September 2026. If something here is out of date, email hello@visitmy.shop and we will fix it.</p>
      </Article>
    </MarketingShell>
  );
}
