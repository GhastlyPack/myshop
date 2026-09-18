import type { Metadata } from "next";
import { Article, MarketingShell } from "@/components/landing/shell";
import { JsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Plans and fees, the free trial, payouts, refunds, file limits, booking calls, what you can sell, and how delivery works on visitmy.shop.",
  alternates: { canonical: "/faq" },
};

const FAQ: [string, string][] = [
  ["What does it cost?", "Two plans. Basic is $9 a month (or $90 a year) with a 5% fee on sales, so you keep 95%. Pro is $49 a month (or $490 a year) with a 0% fee, so you keep 100%. Stripe's card processing fee applies to paid sales on both plans and goes to Stripe."],
  ["Can I try it first?", "Yes. Every new account starts with a 7-day free trial of full Pro. You add a card at signup and nothing is charged until the trial ends; cancel before then and you pay nothing. When the trial ends, the plan you picked starts."],
  ["When should I move from Basic to Pro?", "Basic is cheaper until you sell about $800 a month. Above that, Pro's 0% fee saves you more than the $40 difference in price, and you get the full design editor, Instagram auto-replies, discount codes, order bumps, custom checkout fields, pixel tracking, and team access."],
  ["How do I get paid?", "You connect your own Stripe account once. Buyers pay you directly through Stripe, the money lands in your Stripe balance, and Stripe pays out to your bank on its normal schedule. We never hold your funds."],
  ["What can I sell?", "Digital downloads such as PDFs, guides, templates, presets, audio, video, and zip files, free or paid. Booking calls on Pro: buyers pick a time and pay, and the call lands on your Google Calendar with a Meet link. And link products that point anywhere, for example a YouTube playlist."],
  ["How big can a file be?", "Up to 5 GB per file. We show a warning above 500 MB because buyers on mobile data will feel it. A product can bundle several files."],
  ["What does a buyer have to fill in?", "For a free download, a name and an email. For a paid product, the same plus a card, handled by Stripe. No mailing address, no captcha. Any custom fields you add are optional unless you mark them required."],
  ["How is the file delivered?", "The moment the order clears, the buyer gets an email with download links. Those links also live in their library at visitmy.shop/me, so they can come back for the file later without digging through email."],
  ["Can I issue refunds?", "Yes, from the Income page in one click. The refund goes back through Stripe and the buyer's download access is revoked."],
  ["Can I change my store link later?", "Yes, from Settings, with a live availability check. Product links use plain slugs like visitmy.shop/you/my-guide, and if you rename a product the old link keeps working."],
  ["Do reviews come from real buyers?", "Only buyers can leave a review, after the download. You approve each one before it appears on the product page."],
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
