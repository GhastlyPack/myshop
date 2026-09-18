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
      "New /features page: five illustrated chapters (Sell, Book, Grow, Design, Deliver) and a side-by-side with the other creator stores. The landing page was rebuilt around it, the top nav is down to four links, and buttons use the brand orange.",
      "Pricing tiers on Pro: one product, up to six prices, each unlocking the files you pick. Pay what you want with a floor you set, or none. Up to five order bumps per product, each with its own discount.",
      "Your own ad pixels on Pro: connect Meta, Google, and TikTok pixels per store, plus a Meta Conversions API token for server-side purchase events, deduplicated against the pixel.",
      "Start without a card: claim your link, design the whole store, and reserve it as a draft. A card is asked for when you publish, upload a file, or switch on a Pro feature, and it starts 7 days of full Pro. At the end you're on Basic unless you upgrade; upgrade during the trial and take 5% off Pro for 12 months.",
      "Booking calls on Pro. Sell a call like a file: buyers pick a time from your open hours in a month calendar, in their own timezone, pay through Stripe, and the call lands on your Google Calendar with a Google Meet link. Busy times block availability, both sides get a branded confirmation with a calendar invite, and free and paid calls both work.",
      "Bookings come with a prep doc delivered on confirmation, a post-booking questionnaire whose answers are emailed to you, and a separate meeting description that goes on the calendar event instead of the product blurb.",
      "The product editor previews the storefront card and the product page as you type, with the thumbnail and banner uploads above the preview.",
      "Instagram auto-replies can send a booking link, and the DM card's button now uses the product's own button text (Book now, Get the guide, and so on).",
      "Google sign-in and Google Analytics.",
      "Instagram keyword auto-replies: connect Instagram, set a keyword per product, and comments or DMs get a private reply with the product link and a card. Custom reply text per product.",
      "Discount codes and limited quantities, with one combined delivery email.",
      "Deleting a product now archives it, so past buyers keep their downloads.",
      "Download links are rate-limited per buyer so a leaked link can't be hammered.",
      "New share cards for the site, every store, and every product.",
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
