import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { existsSync } from "node:fs";
import path from "node:path";
import { ClaimForm } from "@/components/landing/claim-form";
import { MarketingShell } from "@/components/landing/shell";
import { getCurrentUser, loginPath } from "@/lib/auth";
import { COMPETITORS, PLANS } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Everything visitmy.shop does: digital downloads, lead magnets, pricing tiers, pay what you want, order bumps, booking calls with Google Calendar and Meet, Instagram keyword auto-replies, Meta/Google/TikTok pixels, a full design editor, and instant delivery with a buyer library.",
  alternates: { canonical: "/features" },
};

type Feature = { title: string; body: string; pro?: boolean };
type Chapter = {
  key: string;
  eyebrow: string;
  title: string;
  intro: string;
  art: { file: string; width: number; height: number; alt: string };
  features: Feature[];
};

const CHAPTERS: Chapter[] = [
  {
    key: "sell",
    eyebrow: "Sell",
    title: "Any product, any price.",
    intro: "A $39 manual, a free checklist, a link to something you host elsewhere. Price it once, or let the buyer choose.",
    art: { file: "sell.jpg", width: 1200, height: 800, alt: "Three boxes in ascending size, the largest banded in orange, beside a price tag" },
    features: [
      { title: "Digital downloads", body: "Upload up to 5 GB per file. Buyers get a private link the second they pay, and every file they've ever bought stays in their library." },
      { title: "Lead magnets", body: "A free product asks for a name and an email, nothing else. No mailing address, no captcha, no friction." },
      { title: "Links", body: "Sell or give away something you host elsewhere. The card goes straight to it after checkout." },
      { title: "Pricing tiers", body: "One product, up to six prices: Basic, Plus, Pro. Each tier unlocks the files you pick.", pro: true },
      { title: "Pay what you want", body: "Set a suggested price and a floor, or no floor at all. Buyers name their number.", pro: true },
      { title: "Order bumps, plural", body: "Offer up to five one-tap add-ons above the pay button, each with its own discount. Stan allows one.", pro: true },
      { title: "Discount codes and limited quantity", body: "Percent or amount off, expiry, max uses. Cap a launch at 50 seats and watch it sell out.", pro: true },
      { title: "Custom checkout questions", body: "Ask for a handle, a size, a goal. Answers land on the order.", pro: true },
      { title: "Clean product links", body: "visitmy.shop/you/my-guide. No random numbers stapled to the end." },
    ],
  },
  {
    key: "book",
    eyebrow: "Book",
    title: "Sell an hour of your time.",
    intro: "A call is just another product. Buyers pick a time, pay, and it lands on your calendar with a Meet link. You never open a scheduling tool.",
    art: { file: "book.jpg", width: 1200, height: 800, alt: "A desk calendar with one date marked in orange beside a phone showing empty time slots" },
    features: [
      { title: "Google Calendar sync", body: "Connect your calendar once. Your busy times block your open hours automatically, so you can't be double-booked.", pro: true },
      { title: "Google Meet on every booking", body: "Each confirmed call gets its own Meet link, written to your calendar and emailed to both of you.", pro: true },
      { title: "Open hours, buffers, notice", body: "Set the days and hours you take calls, a buffer between them, and how far out people can book.", pro: true },
      { title: "The buyer's timezone", body: "They see a real month calendar in their own timezone. You see the call in yours." },
      { title: "Pre-call materials", body: "Attach a prep doc and it's delivered with the confirmation." },
      { title: "Pre-call questionnaire", body: "Ask a few questions after they book. The answers are emailed to you before the call.", pro: true },
      { title: "Calendar invites, both sides", body: "A branded confirmation with a calendar file, plus Google's own invite, so it shows up everywhere." },
    ],
  },
  {
    key: "grow",
    eyebrow: "Grow",
    title: "Turn comments into customers.",
    intro: "Instagram is where your buyers already are. Give a product a keyword and the rest is automatic.",
    art: { file: "grow.jpg", width: 1200, height: 800, alt: "A megaphone pointed at a rising bar chart with the tallest bar in orange" },
    features: [
      { title: "Instagram keyword auto-replies", body: "Someone DMs or comments \"guide\" and they get a branded product card with the link, in seconds. Works for downloads and booking calls alike.", pro: true },
      { title: "Your own pixels", body: "Connect your Meta, Google, and TikTok pixels. Every view, checkout, lead, and purchase fires on your storefront so your ads optimize on real buyers.", pro: true },
      { title: "Server-side Meta events", body: "Add a Conversions API token and purchases are sent server-to-server too, deduplicated against the pixel.", pro: true },
      { title: "Analytics that explain themselves", body: "Views, clicks per card, conversions, and where the traffic came from: Instagram, a story, a DM, a search." },
      { title: "Reviews from real buyers", body: "After the download, buyers rate it and leave a line. You approve what shows." },
      { title: "Marketing opt-in", body: "A checkbox at checkout builds your list with people who actually bought." },
    ],
  },
  {
    key: "design",
    eyebrow: "Design",
    title: "Every store looks like you.",
    intro: "Not a theme and two colors. Fonts, palette, layout, card styles, and a live preview while you work.",
    art: { file: "design.jpg", width: 1200, height: 800, alt: "A fanned paint-swatch deck, a ruler, and an orange pen over a blank phone mockup" },
    features: [
      { title: "Presets to start from", body: "Paper, Sunset, and more. Pick one and your store is already distinctive." },
      { title: "The full editor", body: "Two Google fonts, your palette, background image or gradient, list, grid, or hero layout. Watch it change live.", pro: true },
      { title: "Card styles per product", body: "Button, callout, or preview. Mix them on one store." },
      { title: "Preview while you write", body: "The product editor shows the storefront card and the product page as you type." },
      { title: "Remove visitmy.shop branding", body: "Your store, your name only.", pro: true },
    ],
  },
  {
    key: "deliver",
    eyebrow: "Deliver",
    title: "Paid in seconds, delivered in seconds.",
    intro: "Money goes to your own Stripe. Files go to the buyer. Nothing waits on us.",
    art: { file: "deliver.jpg", width: 1200, height: 800, alt: "An open envelope with an orange document sliding out beside a padlock and a checkmark" },
    features: [
      { title: "Your own Stripe", body: "Connect your Stripe account and payouts go straight to you, on your schedule. We never hold your money." },
      { title: "Branded delivery emails", body: "A clean confirmation with download links, in your store's name." },
      { title: "A library for your buyers", body: "Everything they've bought, from every creator, behind one magic link at visitmy.shop/me. No passwords." },
      { title: "Secure download links", body: "Signed, rate-limited, and tied to the buyer. A leaked link can't be hammered." },
      { title: "Refunds handled", body: "Refund in Stripe and the download switches off on its own." },
      { title: "0% fee on Pro", body: `Basic keeps ${100 - PLANS[0].feePercent}% of every sale. Pro keeps all of it.` },
    ],
  },
];

function hasArt(file: string) {
  return existsSync(path.join(process.cwd(), "public", "landing", "features", file));
}

/** Chapter artwork, or a designed placeholder tile until the asset is generated. */
function Art({ art, priority }: { art: Chapter["art"]; priority?: boolean }) {
  if (hasArt(art.file)) {
    return <Image src={`/landing/features/${art.file}`} alt={art.alt} width={art.width} height={art.height} className="w-full rounded-3xl" sizes="(min-width: 1024px) 560px, 100vw" priority={priority} />;
  }
  return (
    <div className="relative aspect-[3/2] w-full overflow-hidden rounded-3xl" style={{ background: "linear-gradient(135deg, var(--ld-tint) 0%, #ffffff 60%)" }} aria-hidden>
      <div className="absolute left-[12%] top-[22%] h-[56%] w-[30%] rounded-2xl bg-[var(--ld-ink)]" />
      <div className="absolute left-[48%] top-[34%] h-[44%] w-[26%] rounded-2xl border ld-line bg-white" />
      <div className="absolute left-[54%] top-[24%] h-[10%] w-[14%] rounded-full bg-[var(--ld-orange)]" />
    </div>
  );
}

function ProPill() {
  return <span className="ml-2 inline-flex items-center rounded-full bg-[var(--ld-orange)] px-2 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wide text-white">Pro</span>;
}

export default async function FeaturesPage() {
  const user = await getCurrentUser();
  const loginHref = loginPath("/app");
  const loginBase = loginHref.split("?")[0];

  return (
    <MarketingShell>
      {/* ---------- hero ---------- */}
      <section>
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-16 pb-16 sm:px-8 lg:grid-cols-[1fr_1fr] lg:gap-14 lg:pt-24 lg:pb-24">
          <div>
            <p className="ld-muted text-sm font-semibold uppercase tracking-[0.18em]">Everything you get</p>
            <h1 className="ld-heading mt-4 text-[2.8rem] sm:text-[3.6rem] lg:text-[4.4rem]">
              One link. <br className="hidden sm:block" />
              The <span className="ld-orange">whole business.</span>
            </h1>
            <p className="ld-muted mt-6 max-w-xl text-lg leading-relaxed sm:text-xl">
              Sell downloads, book calls, run your Instagram replies, fire your own ad pixels, and design a store that looks like you. From ${PLANS[0].monthly} a month.
              Stan charges ${COMPETITORS.stan.entry} to start and ${COMPETITORS.stan.top} for the good stuff.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {user ? (
                <Link href="/app" className="ld-btn ld-btn-primary">
                  Open your dashboard
                </Link>
              ) : (
                <Link href={loginHref} className="ld-btn ld-btn-primary">
                  Claim your link
                </Link>
              )}
              <Link href="/pricing" className="ld-btn ld-btn-ghost">
                See pricing
              </Link>
            </div>
            <nav aria-label="On this page" className="mt-10 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {CHAPTERS.map((c) => (
                <a key={c.key} href={`#${c.key}`} className="ld-muted underline-offset-4 hover:text-[var(--ld-ink)] hover:underline">
                  {c.eyebrow}
                </a>
              ))}
            </nav>
          </div>
          <Art art={{ file: "hero.jpg", width: 1536, height: 1024, alt: "A phone showing a storefront of stacked cards beside a small orange awning, a coin, and a folded document" }} priority />
        </div>
      </section>

      {/* ---------- chapters ---------- */}
      {CHAPTERS.map((c, i) => {
        const dark = i % 2 === 1;
        return (
          <section key={c.key} id={c.key} className={`scroll-mt-20 ${dark ? "ld-ink" : "border-t ld-line bg-white"}`}>
            <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
              <div className={`grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start lg:gap-16 ${i % 2 === 0 ? "" : "lg:[&>*:first-child]:order-2"}`}>
                <div className="lg:sticky lg:top-24">
                  <p className={`text-sm font-semibold uppercase tracking-[0.18em] ${dark ? "text-[var(--ld-orange)]" : "ld-orange"}`}>{c.eyebrow}</p>
                  <h2 className="ld-heading mt-3 text-[2.2rem] sm:text-[3rem]">{c.title}</h2>
                  <p className="ld-muted mt-5 max-w-md text-lg leading-relaxed">{c.intro}</p>
                  <div className="mt-8">
                    <Art art={c.art} />
                  </div>
                </div>
                <dl className={`divide-y border-y ${dark ? "divide-white/10 border-white/10" : "ld-line"}`}>
                  {c.features.map((f) => (
                    <div key={f.title} className="py-5">
                      <dt className="font-semibold">
                        {f.title}
                        {f.pro && <ProPill />}
                      </dt>
                      <dd className="ld-muted mt-1.5 leading-relaxed">{f.body}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </section>
        );
      })}

      {/* ---------- vs Stan strip ---------- */}
      <section className="border-t ld-line bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-16">
            <div>
              <h2 className="ld-heading text-[2.2rem] sm:text-[2.8rem]">Half of Stan&apos;s price. More of the features.</h2>
              <p className="ld-muted mt-5 text-lg leading-relaxed">
                Booking calls, pixels, and branding removal sit on Stan&apos;s ${COMPETITORS.stan.top} plan. Here they&apos;re on Pro at ${PLANS[1].monthly}, with a 0% fee. Pricing tiers, pay what
                you want, and multiple order bumps aren&apos;t on Stan at all.
              </p>
              <Link href="/compare/stan-store" className="ld-btn ld-btn-ink mt-8">
                See the full comparison
              </Link>
            </div>
            <dl className="divide-y ld-line rounded-2xl border ld-line">
              {[
                ["Booking calls with Google Calendar + Meet", `Pro, $${PLANS[1].monthly}`, `$${COMPETITORS.stan.top} plan`],
                ["Your own Meta, Google, TikTok pixels", `Pro, $${PLANS[1].monthly}`, `$${COMPETITORS.stan.top} plan`],
                ["Order bumps per product", "Up to 5", "1"],
                ["Pricing tiers, pay what you want", "Yes", "No"],
                ["Fee on sales", "0% on Pro", "0%"],
              ].map(([label, us, stan]) => (
                <div key={label} className="grid grid-cols-[1fr_auto_auto] items-baseline gap-4 px-5 py-4 text-sm">
                  <dt className="font-medium">{label}</dt>
                  <dd className="ld-orange font-semibold">{us}</dd>
                  <dd className="ld-muted w-20 text-right">{stan}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ---------- final CTA ---------- */}
      <section className="ld-orange-band">
        <div className="mx-auto flex max-w-6xl flex-col items-center px-5 py-20 text-center sm:px-8 lg:py-28">
          <h2 className="ld-heading text-[2.6rem] sm:text-[3.6rem]">All of it, from ${PLANS[0].monthly} a month.</h2>
          <p className="mt-5 max-w-lg text-lg text-white/85">Every account starts with 7 days of Pro. Claim your link and see for yourself.</p>
          <div className="mt-9 flex w-full justify-center">
            {user ? (
              <Link href="/app" className="ld-btn ld-btn-paper">
                Open your dashboard
              </Link>
            ) : (
              <ClaimForm loginBase={loginBase} tone="orange" />
            )}
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
