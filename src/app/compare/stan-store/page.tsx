import type { Metadata } from "next";
import Link from "next/link";
import { Article, MarketingShell } from "@/components/landing/shell";

export const metadata: Metadata = {
  title: "Stan store alternative: visitmy.shop vs Stan",
  description: "A detailed comparison of visitmy.shop and Stan store for creators selling digital products from their Instagram bio: design, checkout, URLs, reviews, buyer library, and price.",
  alternates: { canonical: "/compare/stan-store" },
};

const ROWS: [string, string, string][] = [
  ["Monthly price", "Free during early access", "$29 (Creator) or $99 (Creator Pro)"],
  ["Fee on sales", "0% platform fee. Stripe processing only", "0% platform fee. Stripe processing only"],
  ["Store design", "Font pairs, layouts, colors, backgrounds, button and card shapes, live preview", "A theme plus button and background color"],
  ["Product URLs", "visitmy.shop/you/my-guide", "stan.store/you/p/my-guide-4821, numeric suffix forced"],
  ["Free download asks for", "Name and email", "Name, email, full mailing address, two checkboxes, reCAPTCHA"],
  ["Buyer download library", "Yes, at visitmy.shop/me, across every creator", "No"],
  ["Reviews from buyers", "Collected after download, you approve", "Pasted in by hand"],
  ["Pixel and analytics", "Meta Pixel and Conversions API on every store", "Pixel on the $99 plan"],
  ["Remove platform branding", "Small footer badge on every store today", "$99 plan"],
  ["Instagram DM keyword", "Per product, custom reply text", "AutoDM, keyword to one message"],
  ["Courses, memberships, bookings", "Coming soon", "Yes, on paid plans"],
];

export default function StanComparePage() {
  return (
    <MarketingShell>
      <Article
        title="visitmy.shop vs Stan store."
        intro="Stan is the best-known creator store and it earns that. If you sell courses, memberships, or bookings today, it does things we do not yet. If you sell digital products from your bio, read on."
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
          Stan sells courses, memberships, webinars, and calendar bookings, with email broadcasts and an affiliate program on its Pro plan. If those are
          your business, Stan is the more complete tool today. We are building toward courses, bookings, and communities, but they are not here yet.
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
        <h3>Pixel tracking on every store</h3>
        <p>Meta Pixel and the Conversions API are on by default. Stan reserves pixel tracking for its $99 plan.</p>

        <h2>Pricing</h2>
        <p>
          Stan is $29 a month before your first sale, or $99 for Pro. visitmy.shop is free during early access with no platform fee; you pay Stripe’s
          processing fee only. See <Link href="/pricing">pricing</Link>.
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
