import type { Metadata } from "next";
import { Article, MarketingShell } from "@/components/landing/shell";
import { JsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Plans and fees, the card-free start and the 7-day Pro trial, payouts, refunds, file limits, booking calls, pricing tiers, what you can sell, and how delivery works on visitmy.shop.",
  alternates: { canonical: "/faq" },
};

const FAQ: [string, string][] = [
  ["What does it cost?", "Two plans. Basic is $9 a month (or $90 a year) with a 5% fee on sales, so you keep 95%. Pro is $49 a month (or $490 a year) with a 0% fee, so you keep 100%. Stripe's card processing fee applies to paid sales on both plans and goes to Stripe."],
  ["Do I need a card to start?", "No. Claim your link, pick a theme or open the editor, and build the whole store with nothing on file. A card is asked for the first time you publish, upload a file, or switch on a Pro feature."],
  ["How does the trial work?", "The moment you add a card you get 7 days of full Pro, free. When the trial ends your plan is Basic at $9 a month unless you upgrade to Pro. Upgrade before the trial ends and you take 5% off Pro for your first 12 months. Cancel during the trial and you pay nothing; your store comes off the air but your link stays yours."],
  ["Basic or Pro?", "Basic if you are listing a couple of downloads and want the cheapest way to sell from your bio. Pro if you want to sell calls, run Instagram keyword replies, price a product in tiers or let buyers name their price, add order bumps, fire your own Meta, Google, and TikTok pixels, use the full design editor, or take our name off your store. One booked call or a few order bumps covers the $49, and Pro's 0% fee means you keep all of it."],
  ["How do I get paid?", "You connect your own Stripe account once. Buyers pay you directly through Stripe, the money lands in your Stripe balance, and Stripe pays out to your bank on its normal schedule. We never hold your funds."],
  ["What can I sell?", "Digital downloads such as PDFs, guides, templates, presets, audio, video, and zip files, free or paid. Booking calls on Pro: buyers pick a time and pay, and the call lands on your Google Calendar with a Meet link. And link products that point anywhere, for example a YouTube playlist."],
  ["How big can a file be?", "Up to 5 GB per file. We show a warning above 500 MB because buyers on mobile data will feel it. A product can bundle several files."],
  ["What does a buyer have to fill in?", "For a free download, a name and an email. For a paid product, the same plus a card, handled by Stripe. No mailing address, no captcha. Any custom fields you add are optional unless you mark them required."],
  ["How is the file delivered?", "The moment the order clears, the buyer gets an email with download links. Those links also live in their library at visitmy.shop/me, so they can come back for the file later without digging through email."],
  ["Can I issue refunds?", "Yes, from the Income page in one click. The refund goes back through Stripe and the buyer's download access is revoked."],
  ["Can I change my store link later?", "Yes, from Settings, with a live availability check. Product links use plain slugs like visitmy.shop/you/my-guide, and if you rename a product the old link keeps working."],
  ["Do reviews come from real buyers?", "Only buyers can leave a review, after the download. You approve each one before it appears on the product page."],
  ["Can one product have more than one price?", "Yes, on Pro. Pricing tiers put up to six prices on one product, each unlocking the files you choose. Pay what you want sets a suggested price with a floor you pick, or no floor. And up to five order bumps sit above the pay button, each with its own discount."],
  ["What is the Instagram DM keyword?", "Give a product a keyword. When someone comments or messages that word on Instagram, we reply with the product link automatically, using a message you write. Available on Pro."],
  ["Can I sell calls?", "Yes, on Pro. Set your open hours, connect Google Calendar, and buyers pick a time, pay through Stripe, and get a Google Meet link and a calendar invite. Busy times on your calendar block availability automatically, and buyers see times in their own timezone. Free discovery calls work too, and you can attach a prep doc that goes out with the confirmation."],
  ["Do you offer courses or memberships?", "Not yet. Memberships and community access, courses, and an affiliate program are planned for Pro but not shipped. Today the store sells digital downloads, links, and booking calls."],
];

export default function FaqPage() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
  return (
    <MarketingShell>
      <JsonLd data={faqLd} />
      <Article title="Questions, answered." intro="Fees, payouts, refunds, file limits, and what a buyer actually goes through.">
        <dl>
          {FAQ.map(([q, a]) => (
            <div key={q}>
              <dt>{q}</dt>
              <dd>{a}</dd>
            </div>
          ))}
        </dl>
      </Article>
    </MarketingShell>
  );
}
