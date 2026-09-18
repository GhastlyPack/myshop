import type { Metadata } from "next";
import Link from "next/link";
import { Article, MarketingShell } from "@/components/landing/shell";

export const metadata: Metadata = {
  title: "Stan store alternative: visitmy.shop vs Stan",
  description: "visitmy.shop vs Stan store for creators selling digital products from their bio: $9 and $49 plans against $29 and $99, design control, checkout, URLs, reviews, buyer library, and fees.",
  alternates: { canonical: "/compare/stan-store" },
};

const ROWS: [string, string, string][] = [
  ["Monthly price", "$9 Basic or $49 Pro", "$29 Creator or $99 Creator Pro"],
  ["Fee on sales", "5% on Basic, 0% on Pro", "0% on both plans"],
  ["Free trial", "7 days of full Pro", "14 days"],
  ["Store design", "Preset themes on Basic; full editor (fonts, colors, layout) on Pro", "A theme plus button and background color"],
  ["Product URLs", "visitmy.shop/you/my-guide", "stan.store/you/p/my-guide-4821, numeric suffix forced"],
  ["Free download asks for", "Name and email", "Name, email, full mailing address, two checkboxes, reCAPTCHA"],
  ["Buyer download library", "Yes, at visitmy.shop/me, across every creator", "No"],
  ["Reviews from buyers", "Collected after download, you approve", "Pasted in by hand"],
  ["Pixel tracking", "Meta, Google, and TikTok on Pro ($49)", "Pixel on the $99 plan"],
  ["Remove platform branding", "Pro ($49)", "$99 plan"],
  ["Instagram DM keyword", "Per product with custom reply text, on Pro", "AutoDM, keyword to one message"],
  ["Discount codes, order bumps, limited quantity", "Pro", "Paid plans, one bump on Pro"],
  ["Booking calls", "Pro ($49): Google Calendar, auto Meet link, invites both ways", "$99 plan"],
  ["Courses, memberships", "Coming soon", "Yes, on paid plans"],
];

export default function StanComparePage() {
  return (
    <MarketingShell>
      <Article
        title="visitmy.shop vs Stan store."
        intro="Stan is the best-known creator store and it earns that. If you sell courses or memberships today, it does things we do not yet. If you sell digital products from your bio, read on."
        updated="September 2026"
      >
        <table>
          <thead>
            <tr>
              <th />
              <th>visitmy.shop</th>
              <th>Stan store</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([k, us, them]) => (
              <tr key={k}>
                <td>{k}</td>
                <td>{us}</td>
                <td>{them}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2>Where Stan is stronger</h2>
        <p>
          Stan sells courses, memberships, and webinars, with email broadcasts and an affiliate program on its Pro plan. If those are your business, Stan
          is the more complete tool today. We are building toward courses, memberships, and an affiliate program, but they are not here yet.
        </p>

        <h2>Where visitmy.shop is stronger</h2>
        <h3>Your store does not look like every other store</h3>
        <p>
          Stan gives you a theme and two colors. Reviewers mention it constantly: every Stan store looks the same. On visitmy.shop you pick a preset,
          then change the font pair, the layout, the colors, the background, and the button shape, with a live preview. It still stays clean on a phone.
        </p>
        <h3>A checkout that respects a $9 PDF</h3>
        <p>
          Stan’s default checkout asks for a full mailing address, a marketing checkbox, a terms checkbox, and a reCAPTCHA, even for a free download.
          Ours asks for a name and an email. Paid products add a card, handled by Stripe. Fewer fields means more people finish.
        </p>
        <h3>Links you would actually put in a caption</h3>
        <p>
          Stan forces a numeric suffix on product URLs. Ours are plain: visitmy.shop/you/my-guide. If you rename a product, the old link keeps
          working.
        </p>
        <h3>Reviews that collect themselves</h3>
        <p>
          After a download, buyers can rate the product and leave a line. You approve what shows. Stan stores show testimonials the creator pasted in.
        </p>
        <h3>A library for buyers</h3>
        <p>
          Every buyer gets a magic-link library at visitmy.shop/me with everything they have ever bought, from every creator on the platform. No more
          digging through email for a file from six months ago.
        </p>
        <h3>Booking calls at half the price</h3>
        <p>
          Sell a call the way you sell a file. Buyers pick a time from your open hours, pay through Stripe, and the call lands on your Google Calendar
          with a Google Meet link already attached. Busy times block availability, so no double-booking; both sides get a branded confirmation with a
          calendar invite; buyers see times in their own timezone. Free discovery calls and paid calls both work, and you can attach a prep doc that ships
          with the confirmation. Stan puts booking calls on its $99 plan. Ours are on Pro at $49.
        </p>
        <h3>Pixel tracking at half the price</h3>
        <p>Meta, Google, and TikTok pixels come with Pro at $49. Stan reserves pixel tracking for its $99 plan.</p>

        <h2>Pricing: cut Stan in half, keep 100% of your sales</h2>
        <p>
          Stan is $29 a month before your first sale and $99 for Creator Pro. visitmy.shop is $9 for Basic and $49 for Pro: a third of their entry
          price and half their top price. The honest difference is the fee. Stan charges 0% on both plans; our Basic plan keeps 5% of each sale and Pro
          keeps nothing. Under about $800 a month in sales, Basic still comes out cheaper than Stan’s $29. Above that, Pro at $49 with a 0% fee beats
          Stan’s $99. Every account starts with 7 days of full Pro access. See <Link href="/pricing">pricing</Link>.
        </p>

        <h2>Moving from Stan</h2>
        <ol>
          <li>
            <Link href="/">Claim your link</Link> and pick a theme.
          </li>
          <li>Upload each product file, set the price, paste your description.</li>
          <li>Swap the link in your bio and your pinned posts. Old Stan links keep working while you transition.</li>
        </ol>
        <p>Compared against Stan’s published plans and default checkout in September 2026. Email hello@visitmy.shop if something changed.</p>
      </Article>
    </MarketingShell>
  );
}
