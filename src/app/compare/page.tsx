import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { AwningMark } from "@/components/brand/mark";
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
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {KEYS.map((k) => {
            const c = COMPETITORS[k];
            return (
              <Link key={k} href={`/compare/${c.slug}`} className="ld-card flex flex-col p-7 transition-colors hover:bg-[var(--ld-tint)]">
                <div className="flex items-center gap-3">
                  <Image src={c.logo} alt="" width={36} height={36} className="h-9 w-9 rounded-lg" />
                  <div className="text-lg font-semibold">{c.name}</div>
                </div>
                <dl className="mt-5 space-y-2 text-sm">
                  <div className="flex gap-3">
                    <dt className="ld-muted w-12 shrink-0">Price</dt>
                    <dd>{c.price}</dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="ld-muted w-12 shrink-0">Fee</dt>
                    <dd>{c.fee}</dd>
                  </div>
                </dl>
                <p className="mt-5 text-[0.95rem] leading-relaxed">{c.verdict}</p>
                <span className="mt-auto pt-6 text-sm font-medium text-[var(--ld-orange-ink)]">Full comparison</span>
              </Link>
            );
          })}
        </div>

        {/* matrix */}
        <div className="ld-card mt-16 overflow-x-auto">
          <table className="ld-table ld-table-wide w-full min-w-[960px]">
            <thead>
              <tr>
                <th scope="col" />
                <th scope="col">
                  <span className="inline-flex items-center gap-2 text-[var(--ld-orange-ink)]">
                    <AwningMark width={22} />
                    visitmy.shop
                  </span>
                </th>
                {KEYS.map((k) => (
                  <th key={k} scope="col">
                    <span className="inline-flex items-center gap-2">
                      <Image src={COMPETITORS[k].logo} alt="" width={22} height={22} className="h-[22px] w-[22px] rounded-md" />
                      {COMPETITORS[k].name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIX.map((r) => (
                <tr key={r.label}>
                  <th scope="row" className="font-medium">
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
            <strong>If you sell courses or memberships today</strong>, Stan is the more complete tool and we say so on its page. Ours are coming soon, not
            shipped. Booking calls are live on our Pro plan at $49; Stan sells them on its $99 tier.
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
