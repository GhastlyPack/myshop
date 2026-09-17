import type { Metadata } from "next";
import { CompetitorArticle } from "@/components/landing/competitor-article";
import { MarketingShell } from "@/components/landing/shell";

export const metadata: Metadata = {
  title: "Gumroad alternative: visitmy.shop vs Gumroad",
  description: "visitmy.shop compared with Gumroad for creators selling digital products from their bio: price, fees, design control, checkout, buyer library, reviews, and Instagram replies.",
  alternates: { canonical: "/compare/gumroad" },
};

export default function Page() {
  return (
    <MarketingShell>
      <CompetitorArticle competitor="gumroad" />
    </MarketingShell>
  );
}
