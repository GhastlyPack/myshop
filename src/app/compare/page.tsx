import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/landing/shell";
import { COMPARED_ON, COMPETITORS, MATRIX, type CompetitorKey } from "@/lib/compare";

export const metadata: Metadata = {
  title: "Compare: visitmy.shop vs Stan, Linktree, Beacons, Gumroad",
  description: "One table. Price, fees, design control, product URLs, checkout fields, buyer library, reviews, pixels, and Instagram replies across visitmy.shop, Stan store, Linktree, Beacons, and Gumroad.",
  alternates: { canonical: "/compare" },
};

const KEYS: CompetitorKey[] = ["stan", "linktree", "beacons", "gumroad"];

export default function ComparePage() {
  return (
    <MarketingShell>
      <main className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
        <div className="max-w-3xl">
          <h1 className="ld-heading text-[2.6rem] sm:text-[3.6rem]">Compare the bio-link stores.</h1>
          <p className="ld-muted mt-6 text-xl leading-relaxed">
            Five tools, one table. We include what the others do better, because you will find out anyway. Numbers are from published plans as of {COMPARED_ON}.
          </p>
        </div>

        {/* verdict cards */}
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {KEYS.map((k) => {
            const c = COMPETITORS[k];
            return (
              <Link key={k} href={`/compare/${c.slug}`} className="ld-card flex flex-col p-6 transition-colors hover:bg-[var(--ld-tint)]">
                <div className="text-lg font-semibold">{c.name}</div>
                <div className="ld-muted mt-1 text-sm">
                  {c.price} · {c.fee} fee
                </div>
                <p className="mt-4 text-[0.95rem] leading-relaxed">{c.verdict}</p>
                <span className="ld-muted mt-auto pt-5 text-sm font-medium underline underline-offset-4">Full comparison</span>
              </Link>
            );
          })}
        </div>

        {/* matrix */}
        <div className="ld-card mt-16 overflow-x-auto">
          <table className="ld-table w-full min-w-[900px]">
            <thead>
              <tr>
                <th scope="col" className="!pl-6" />
                <th scope="col" className="!text-[var(--ld-orange-ink)]">visitmy.shop</th>
                {KEYS.map((k) => (
                  <th key={k} scope="col">
                    {COMPETITORS[k].name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIX.map((r) => (
                <tr key={r.label}>
                  <th scope="row" className="!pl-6 font-medium">
                    {r.label}
                  </th>
                  <td className="ld-us">{r.us}</td>
                  {KEYS.map((k) => (
                    <td key={k}>{r[k]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="ld-muted mt-4 text-sm">
          Something out of date? Email hello@visitmy.shop and we will fix it the same day.
        </p>

        {/* how to choose */}
        <div className="ld-prose mt-20 max-w-3xl">
          <h2>How to choose</h2>
          <p>
            <strong>If you sell courses, memberships, or bookings today</strong>, Stan is the more complete tool and we say so on its page. Ours are coming
            soon, not shipped.
          </p>
          <p>
            <strong>If you only need a page of links</strong>, Linktree or Beacons are fine and free. The moment you want to sell a file from that page, you
            need a store, and that is where the fee and the checkout start to matter.
          </p>
          <p>
            <strong>If you already have traffic and want zero monthly cost</strong>, Gumroad works, and it takes 10% of every sale for the privilege. Above a
            few hundred dollars a month that is more than our Pro plan.
          </p>
          <p>
            <strong>If you sell digital products from your Instagram bio</strong>, that is exactly what visitmy.shop is built for: a store that is the bio link,
            product pages with clean URLs, a two-field checkout, instant delivery, a buyer library, reviews, and Instagram keyword replies. Basic is $9 with a
            5% fee; Pro is $49 with none. <Link href="/pricing">See pricing</Link> or <Link href="/">claim your link</Link>.
          </p>
        </div>
      </main>
    </MarketingShell>
  );
}
