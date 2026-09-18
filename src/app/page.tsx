import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ClaimForm } from "@/components/landing/claim-form";
import { DmMockup } from "@/components/landing/dm-mockup";
import { MarketingFooter } from "@/components/landing/footer";
import { manrope } from "@/components/landing/fonts";
import { LandingNav } from "@/components/landing/nav";
import { HeroPhone } from "@/components/landing/phone";
import { ThemeCards } from "@/components/landing/theme-cards";
import { Walkthrough } from "@/components/landing/walkthrough";
import { VsOthers } from "@/components/landing/vs-others";
import { JsonLd } from "@/components/seo/json-ld";
import { getCurrentUser, loginPath } from "@/lib/auth";
import { CHAPTERS } from "@/lib/features";
import { PLANS } from "@/lib/plans";
import { absoluteUrl, SITE } from "@/lib/site";
import "@/components/storefront/storefront.css";
import "@/components/landing/landing.css";

export const metadata: Metadata = {
  title: { absolute: "visitmy.shop: your bio link, but it actually sells" },
  description: SITE.description,
  alternates: { canonical: "/" },
};

const STEPS: [string, string][] = [
  ["Claim your link", "visitmy.shop/you. Pick a preset, or open the editor and make it yours. Nothing to pay yet."],
  ["Add what you sell", "A PDF, a template, an hour of your time, a link to something you host elsewhere. Free or paid, one price or three."],
  ["Post about it", "Drop the link in your bio, or give the product a keyword and let Instagram DMs do the selling."],
];

const IG_ROWS: [string, string][] = [
  ["One keyword per product", "Someone comments or DMs the word and the card goes out in seconds, with a message you wrote."],
  ["Downloads and calls alike", "The card's button is the product's own: Get the guide, Book now, Send it to me."],
  ["Your pixels see all of it", "Meta, Google, and TikTok fire on every view, checkout, and purchase, so your ads learn from real buyers."],
];


export default async function Home() {
  const user = await getCurrentUser();
  const loginHref = loginPath("/app");
  const loginBase = loginHref.split("?")[0];

  const orgLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": absoluteUrl("/#org"), name: SITE.name, url: absoluteUrl("/"), logo: absoluteUrl("/icon"), email: SITE.email, sameAs: SITE.profiles },
      { "@type": "WebSite", "@id": absoluteUrl("/#site"), name: SITE.name, url: absoluteUrl("/"), description: SITE.description, publisher: { "@id": absoluteUrl("/#org") } },
    ],
  };

  return (
    <div className={`ld ${manrope.variable}`}>
      <JsonLd data={orgLd} />
      <LandingNav signedIn={Boolean(user)} loginHref={loginHref} />

      {/* ---------- hero ---------- */}
      <section>
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 pt-16 pb-20 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8 lg:pt-28 lg:pb-32">
          <div>
            <h1 className="ld-heading text-[3rem] sm:text-[4rem] lg:text-[5rem]">
              Your bio link, <br className="hidden sm:block" />
              but it <span className="ld-orange">actually sells.</span>
            </h1>
            <p className="ld-muted mt-6 max-w-xl text-lg leading-relaxed sm:text-xl">
              Sell a guide, a template, or an hour of your time from one link in your Instagram bio. Paid straight to your own Stripe, delivered in seconds.
            </p>
            <div className="mt-8">
              {user ? (
                <Link href="/app" className="ld-btn ld-btn-primary">
                  Open your dashboard
                </Link>
              ) : (
                <ClaimForm loginBase={loginBase} />
              )}
            </div>
            <p className="ld-muted mt-6 text-sm">
              Design your store free. Add a card when you publish and your first 7 days are Pro. From ${PLANS[0].monthly} a month after that.{" "}
              <Link href="/demo" className="underline underline-offset-4 hover:text-[var(--ld-ink)]">
                See a live store
              </Link>
              .
            </p>
          </div>
          <div className="py-4 lg:py-0">
            <HeroPhone />
          </div>
        </div>
      </section>

      {/* Proof strip (components/landing/proof-strip.tsx) stays off until there are real creators to show. */}

      {/* ---------- how it works ---------- */}
      <section className="border-t ld-line bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
          <div className="max-w-2xl">
            <h2 className="ld-heading text-[2.4rem] sm:text-[3rem]">Live before you finish your coffee.</h2>
            <p className="ld-muted mt-5 text-lg leading-relaxed">Three things to do. None of them involve a web designer, a payment processor, or a scheduling tool.</p>
          </div>
          <div className="ld-cols mt-12">
            {STEPS.map(([title, body]) => (
              <div key={title}>
                <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
                <p className="ld-muted mt-3 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- instagram ---------- */}
      <section className="ld-ink">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 lg:py-28">
          <DmMockup />
          <div>
            <h2 className="ld-heading text-[2.4rem] sm:text-[3.2rem]">They type one word. You make the sale.</h2>
            <p className="ld-muted mt-5 max-w-lg text-lg leading-relaxed">Your buyers are already in your DMs. Give any product a keyword, any word you like, and the reply, the card, and the link are automatic.</p>
            <dl className="mt-10 divide-y divide-white/10 border-y border-white/10">
              {IG_ROWS.map(([title, body]) => (
                <div key={title} className="py-5">
                  <dt className="font-semibold">{title}</dt>
                  <dd className="ld-muted mt-1.5 leading-relaxed">{body}</dd>
                </div>
              ))}
            </dl>
            <p className="ld-muted mt-6 text-sm">Instagram auto-replies and pixels are on Pro.</p>
          </div>
        </div>
      </section>

      {/* ---------- feature chapters ---------- */}
      <section id="features" className="scroll-mt-20 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <h2 className="ld-heading text-[2.4rem] sm:text-[3rem]">Everything the store does.</h2>
              <p className="ld-muted mt-5 text-lg leading-relaxed">Selling, booking, growing, designing, and delivering. One place, one link.</p>
            </div>
            <Link href="/features" className="ld-btn ld-btn-ghost">
              See every feature
            </Link>
          </div>
          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {CHAPTERS.map((c) => (
              <li key={c.key}>
                <Link href={`/features#${c.key}`} className="ld-card ld-card-lift flex h-full flex-col overflow-hidden hover:bg-[var(--ld-tint)]">
                  <Image src={`/landing/features/${c.art.file}`} alt={c.art.alt} width={c.art.width} height={c.art.height} className="aspect-[3/2] w-full object-cover" sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw" />
                  <span className="flex flex-1 flex-col p-6">
                    <span className="text-xl font-semibold tracking-tight">{c.title}</span>
                    <span className="ld-muted mt-2 leading-relaxed">{c.brief}</span>
                  </span>
                </Link>
              </li>
            ))}
            <li className="ld-card flex flex-col justify-between bg-[var(--ld-tint)] p-6">
              <span className="text-xl font-semibold tracking-tight">Reviews, analytics, discount codes, custom checkout questions, team access.</span>
              <Link href="/features" className="mt-6 text-sm font-medium text-[var(--ld-orange-ink)]">
                The full list
              </Link>
            </li>
          </ul>
        </div>
      </section>

      {/* ---------- themes ---------- */}
      <section id="themes" className="scroll-mt-20 border-t ld-line bg-white">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
          <div className="max-w-2xl">
            <h2 className="ld-heading text-[2.4rem] sm:text-[3rem]">Every store looks like you.</h2>
            <p className="ld-muted mt-5 text-lg leading-relaxed">
              Most bio-link stores look the same because they are. Start from a preset, then change the font pair, the layout, the colors, the background, the button shape. Live preview while you edit, still clean on a phone.
            </p>
          </div>
          <div className="mt-12">
            <ThemeCards />
          </div>
          <Link href="/demo" className="ld-btn ld-btn-ghost mt-10">
            See a live store
          </Link>
        </div>
      </section>

      {/* ---------- walkthrough ---------- */}
      <section className="ld-ink">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
          <div className="max-w-2xl">
            <h2 className="ld-heading text-[2.4rem] sm:text-[3.4rem]">One sale, start to finish.</h2>
            <p className="ld-muted mt-5 text-lg leading-relaxed">The store, the booking page, and the checkout, built from the same parts your buyers will use. Watch it run.</p>
          </div>
          <div className="mt-14">
            <Walkthrough />
          </div>
        </div>
      </section>

      <VsOthers />

      {/* ---------- final CTA ---------- */}
      <section className="ld-orange-band">
        <div className="mx-auto flex max-w-6xl flex-col items-center px-5 py-24 text-center sm:px-8 lg:py-32">
          <h2 className="ld-heading text-[2.8rem] sm:text-[4rem]">Your link is waiting.</h2>
          <p className="ld-muted mt-5 max-w-lg text-lg">Claim it now, add your first product tonight, post about it tomorrow.</p>
          <div className="mt-9 flex w-full justify-center">
            {user ? (
              <Link href="/app" className="ld-btn ld-btn-ink">
                Open your dashboard
              </Link>
            ) : (
              <ClaimForm loginBase={loginBase} tone="orange" />
            )}
          </div>
        </div>
      </section>

      <MarketingFooter signedIn={Boolean(user)} loginHref={loginHref} />
    </div>
  );
}
