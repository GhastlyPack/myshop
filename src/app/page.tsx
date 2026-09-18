import type { Metadata } from "next";
import Link from "next/link";
import { ClaimForm } from "@/components/landing/claim-form";
import { MarketingFooter } from "@/components/landing/footer";
import { manrope } from "@/components/landing/fonts";
import { LandingNav } from "@/components/landing/nav";
import { JsonLd } from "@/components/seo/json-ld";
import { absoluteUrl, SITE } from "@/lib/site";
import { HeroPhone } from "@/components/landing/phone";
import { COMPETITORS, PLANS } from "@/lib/plans";
import Image from "next/image";
import { ThemeCards } from "@/components/landing/theme-cards";
import { getCurrentUser, loginPath } from "@/lib/auth";
import "@/components/storefront/storefront.css";
import "@/components/landing/landing.css";

export const metadata: Metadata = {
  title: { absolute: "visitmy.shop — your bio link, but it actually sells" },
  description: "Sell digital products straight from your Instagram bio. Upload a file, drop one link, get paid to your own Stripe, delivered in seconds.",
  alternates: { canonical: "/" },
};

const FEATURES = [
  ["Any product, free or paid", "A lead magnet or a $39 manual, listed on your store or hidden as its own landing page."],
  ["Clean product links", "visitmy.shop/you/my-guide. No random numbers stapled to the end."],
  ["Reviews from buyers", "After the download, buyers rate it and leave a line. You approve what shows."],
  ["A library for your buyers", "Everything they’ve ever bought, from every creator, behind one magic link at visitmy.shop/me."],
  ["Analytics", "Views, clicks per card, conversions, and where the traffic came from. Meta, Google, and TikTok pixels on Pro."],
  ["Instagram DM keyword", "Give a product a keyword and get the caption, the auto-reply, and the story CTA, ready to paste. Auto-replies on Pro."],
  ["Booking calls", "Sell a 60-minute call. Buyers pick a time from your open hours and pay; it lands on your Google Calendar with a Meet link. DM “consult” and the booking link goes out automatically. On Pro."],
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
              Upload a guide, a template, a preset pack. Drop one link in your Instagram bio. Get paid straight to your own Stripe, delivered in seconds.
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
              From $9 a month. 7-day free trial with full Pro access.{" "}
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

      {/* ---------- first five minutes: real screenshots ---------- */}
      <section className="ld-ink">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
          <div className="max-w-2xl">
            <h2 className="ld-heading text-[2.4rem] sm:text-[3.4rem]">Your first five minutes.</h2>
            <p className="ld-muted mt-5 text-lg leading-relaxed">Real screens from a real store on visitmy.shop, not mockups. Claim a link, upload a file, and this is what your buyers see.</p>
          </div>
          <div className="mt-14 grid gap-10 sm:grid-cols-3 sm:gap-6">
            {[
              { src: "/landing/shots/store-2.jpg", t: "Your store", b: "One link. Your name, your products, your theme. Live at visitmy.shop/you." },
              { src: "/landing/shots/product-2.jpg", t: "A product page", b: "Title, price, cover, a few bullets, and reviews from real buyers." },
              { src: "/landing/shots/checkout-2.jpg", t: "Checkout", b: "Name and email for a free download. Card for a paid one. File lands in seconds." },
            ].map((s, i) => (
              <figure key={s.t}>
                <div className="mx-auto w-[260px] rounded-[40px] bg-[#0f0f10] p-2.5">
                  <Image src={s.src} alt={s.t} width={1000} height={2164} className="w-full rounded-[32px]" sizes="260px" priority={i === 0} />
                </div>
                <figcaption className="mt-6 text-center sm:text-left">
                  <div className="text-lg font-semibold">{s.t}</div>
                  <p className="ld-muted mt-1.5 text-[0.95rem] leading-relaxed">{s.b}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- feature list ---------- */}
      <section id="features" className="scroll-mt-20 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <div>
              <h2 className="ld-heading text-[2.4rem] sm:text-[3rem]">What you get.</h2>
              <p className="ld-muted mt-5 max-w-md text-lg leading-relaxed">The storefront, the checkout, the delivery, the reviews, and the numbers. One place, one link.</p>
            </div>
            <dl className="divide-y ld-line border-y ld-line">
              {FEATURES.map(([title, body]) => (
                <div key={title} className="grid gap-2 py-5 sm:grid-cols-[220px_1fr] sm:gap-8">
                  <dt className="font-semibold">{title}</dt>
                  <dd className="ld-muted leading-relaxed">{body}</dd>
                </div>
              ))}
            </dl>
          </div>
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
          <Link href="/cole" className="ld-btn ld-btn-ghost mt-10">
            See a live store
          </Link>
        </div>
      </section>

      {/* ---------- pricing teaser ---------- */}
      <section id="pricing" className="scroll-mt-20 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-16">
            <div>
              <h2 className="ld-heading text-[2.4rem] sm:text-[3rem]">Start at $9. Keep up to 100%.</h2>
              <p className="ld-muted mt-5 text-lg leading-relaxed">
                Basic is ${PLANS[0].monthly} a month and keeps 95% of each sale. Pro is ${PLANS[1].monthly} a month with a 0% fee, the full design editor,
                booking calls, Instagram auto-replies, and pixels. Stan charges ${COMPETITORS.stan.entry} and ${COMPETITORS.stan.top}. Every account starts with 7 days of Pro.
              </p>
              <Link href="/pricing" className="ld-btn ld-btn-primary mt-8">
                See pricing
              </Link>
            </div>
            <dl className="divide-y ld-line rounded-2xl border ld-line">
              {PLANS.map((p) => (
                <div key={p.key} className="flex items-baseline justify-between gap-4 px-6 py-5">
                  <div>
                    <dt className="text-lg font-semibold">{p.name}</dt>
                    <dd className="ld-muted text-sm">{p.feePercent ? `${p.feePercent}% fee, keep ${100 - p.feePercent}%` : "0% fee, keep 100%"}</dd>
                  </div>
                  <div className="text-right">
                    <div className="ld-heading text-[2rem]">${p.monthly}</div>
                    <div className="ld-muted text-xs">per month · ${p.annual}/yr</div>
                  </div>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ---------- final CTA ---------- */}
      <section className="ld-orange-band">
        <div className="mx-auto flex max-w-6xl flex-col items-center px-5 py-24 text-center sm:px-8 lg:py-32">
          <h2 className="ld-heading text-[2.8rem] sm:text-[4rem]">Your link is waiting.</h2>
          <p className="mt-5 max-w-lg text-lg text-white/85">Claim it now, add your first product tonight, post about it tomorrow.</p>
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

      <MarketingFooter signedIn={Boolean(user)} loginHref={loginHref} />
    </div>
  );
}
