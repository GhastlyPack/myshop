import type { Metadata } from "next";
import { Article, MarketingShell } from "@/components/landing/shell";

export const metadata: Metadata = {
  title: "Changelog",
  description: "What shipped on visitmy.shop, week by week.",
  alternates: { canonical: "/changelog" },
};

const ENTRIES: { date: string; items: string[] }[] = [
  {
    date: "September 17, 2026",
    items: [
      "Google sign-in and Google Analytics.",
      "Instagram keyword auto-replies: connect Instagram, set a keyword per product, and comments or DMs get a private reply with the product link and a card. Custom reply text per product.",
      "Discount codes, limited quantities, and order bumps, with one combined delivery email.",
      "Deleting a product now archives it, so past buyers keep their downloads.",
      "Download links are rate-limited per buyer so a leaked link can't be hammered.",
      "New share cards for the site, every store, and every product.",
      "Redesigned landing page, new demo store, and a new brand palette.",
      "Branded transactional emails.",
      "Change your store link from Settings with a live availability check.",
      "Stripe's outstanding requirements are shown on the Payments card when charges are disabled.",
      "Supabase Storage supported alongside S3.",
    ],
  },
  {
    date: "September 16, 2026",
    items: [
      "Public storefronts and product pages with themes: font pairs, layouts, colors, backgrounds, button and card shapes, live preview.",
      "Free checkout with name and email only, instant delivery, and the buyer library at visitmy.shop/me.",
      "Stripe Connect for paid products, refunds from the Income page, CSV exports.",
      "Analytics, review moderation, Meta Pixel and Conversions API, and the DM keyword helper.",
      "Creator dashboard with a mobile navigation drawer.",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <MarketingShell>
      <Article title="Changelog." intro="What shipped, in plain words. Newest first.">
        {ENTRIES.map((e) => (
          <section key={e.date}>
            <h2>{e.date}</h2>
            <ul>
              {e.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </section>
        ))}
      </Article>
    </MarketingShell>
  );
}
