import type { Metadata } from "next";
import { CompetitorArticle } from "@/components/landing/competitor-article";
import { MarketingShell } from "@/components/landing/shell";

export const metadata: Metadata = {
  title: "Beacons alternative: visitmy.shop vs Beacons",
  description: "visitmy.shop compared with Beacons for creators selling digital products from their bio: price, fees, design control, checkout, buyer library, reviews, and Instagram replies.",
  alternates: { canonical: "/compare/beacons" },
};

export default function Page() {
  return (
    <MarketingShell>
      <CompetitorArticle competitor="beacons" />
    </MarketingShell>
  );
}
