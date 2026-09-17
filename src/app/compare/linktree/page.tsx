import type { Metadata } from "next";
import Link from "next/link";
import { Article, MarketingShell } from "@/components/landing/shell";

export const metadata: Metadata = {
  title: "Linktree alternative for selling digital products",
  description: "Linktree is a link page. visitmy.shop is a store. Here is what that difference means when you want to sell a guide, template, or preset from your bio.",
  alternates: { canonical: "/compare/linktree" },
};

const ROWS: [string, string, string][] = [
  ["What it is", "A store with a checkout and delivery", "A page of links"],
  ["Selling a file", "Built in: upload, price, checkout, instant delivery", "Commerce features on paid plans, with a transaction fee"],
  ["Free lead magnet", "Name and email, file delivered by email and to a library", "Email capture on paid plans; delivery is up to you"],
  ["Payments", "Your own Stripe account, paid directly to you", "Through Linktree's payment setup"],
  ["Design", "Font pairs, layouts, colors, backgrounds, button and card shapes", "Themes and colors, more on paid plans"],
  ["Buyer download library", "Yes, at visitmy.shop/me", "No"],
  ["Reviews from buyers", "Yes, you approve them", "No"],
  ["Pixel tracking", "Pro plan ($49)", "Paid plans"],
  ["Price", "$9 Basic, $49 Pro, 14-day Pro trial", "Free tier, paid tiers for commerce"],
  ["Plain links to other places", "Yes, link products", "Yes, that is the product"],
];

export default function LinktreeComparePage() {
  return (
    <MarketingShell>
      <Article
        title="visitmy.shop vs Linktree."
        intro="Linktree is great at what it is: one page that points to all your other pages. The moment you want to sell a file from that page, you need a store."
        updated="September 2026"
      >
        <table>
          <thead>
            <tr>
              <th />
              <th>visitmy.shop</th>
              <th>Linktree</th>
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

        <h2>Keep Linktree, add a store</h2>
        <p>
          You do not have to choose. Many creators keep a Linktree and add their visitmy.shop product link as the first button. When you are ready,
          make the store the bio link itself: your store has link products too, so the podcast, the newsletter, and the booking page all fit.
        </p>
        <h2>What changes when the bio link is a store</h2>
        <ul>
          <li>A visitor can buy a $9 preset in one screen instead of leaving for a second tool.</li>
          <li>Free downloads capture an email and deliver the file without a third-party form.</li>
          <li>Every product page has its own clean URL you can paste into a caption or a DM.</li>
          <li>Reviews and sales numbers live in one dashboard.</li>
        </ul>
        <p>
          <Link href="/">Claim your link</Link>, or see the <Link href="/compare/stan-store">Stan store comparison</Link> if you are choosing between creator stores.
        </p>
        <p>Compared against Linktree’s published plans in September 2026.</p>
      </Article>
    </MarketingShell>
  );
}
