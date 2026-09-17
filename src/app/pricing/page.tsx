import type { Metadata } from "next";
import Link from "next/link";
import { Article, MarketingShell } from "@/components/landing/shell";

export const metadata: Metadata = {
  title: "Pricing",
  description: "visitmy.shop is free to use while we are in early access. No platform fee on sales. You pay Stripe's card processing fee and nothing else.",
  alternates: { canonical: "/pricing" },
};

const INCLUDED = [
  "Your store at visitmy.shop/yourname, with fonts, layouts, colors, and backgrounds you control",
  "Unlimited products: free downloads, paid downloads, and links",
  "Checkout that asks for name and email only on free products",
  "Files delivered by email in seconds, plus a permanent download library for buyers",
  "Payments straight to your own Stripe account. We never hold your balance",
  "Discount codes, limited quantities, and order bumps",
  "Buyer reviews you approve before they show",
  "Analytics: views, clicks per card, conversions, and traffic source",
  "Meta Pixel and Conversions API on every store",
  "Instagram keyword auto-replies that send the product link",
];

export default function PricingPage() {
  return (
    <MarketingShell>
      <Article title="Free while we are in early access." intro="No monthly fee. No platform fee on your sales. The only cost is Stripe's card processing, which goes to Stripe, not us.">
        <div className="ld-callout">
          <p>
            <strong>What you pay today: $0 to visitmy.shop.</strong> On a paid sale, Stripe keeps its standard processing fee (in the US, 2.9% plus 30¢ per
            card payment) and the rest lands in your Stripe balance. Free downloads cost nothing.
          </p>
        </div>
        <h2>Everything is included</h2>
        <ul>
          {INCLUDED.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
        <h2>What happens when paid plans arrive</h2>
        <p>
          We will introduce a paid plan once the platform is out of early access. When we do, it will be announced on this page and by email to every
          creator first, with time to decide. Stores created during early access keep working either way; we will not switch anything off under you.
        </p>
        <h2>Compare</h2>
        <p>
          Stan charges $29 a month before your first sale and $99 a month for pixel tracking and no branding. Linktree's commerce features sit on paid
          tiers with a transaction fee. See the full <Link href="/compare/stan-store">Stan store comparison</Link> and the{" "}
          <Link href="/compare/linktree">Linktree comparison</Link>.
        </p>
        <p>
          Ready? <Link href="/">Claim your link</Link>. It takes about five minutes to be live.
        </p>
      </Article>
    </MarketingShell>
  );
}
