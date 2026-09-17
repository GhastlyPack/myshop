import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Manrope } from "next/font/google";
import { ArrowRight, BarChart3, Check, FileDown, Library, Link2, MessageCircle, Minus, Palette, Star, X } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { ClaimForm } from "@/components/landing/claim-form";
import { LandingNav } from "@/components/landing/nav";
import { HeroPhone } from "@/components/landing/phone";
import { ThemeCards } from "@/components/landing/theme-cards";
import { SOCIAL_ICONS } from "@/components/storefront/socials";
import { getCurrentUser, loginPath } from "@/lib/auth";
import "@/components/storefront/storefront.css";
import "@/components/landing/landing.css";

const manrope = Manrope({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: { absolute: "visitmy.shop — your bio link, but it actually sells" },
  description: "Sell digital products straight from your Instagram bio. Upload a file, drop one link, get paid to your own Stripe, delivered in seconds.",
};

const FEATURES = [
  { icon: FileDown, title: "Any product, free or paid", body: "One product model. A lead magnet or a $39 manual, listed on your store or hidden as its own landing page. Files, links, companion skills." },
  { icon: Check, title: "Checkout without the friction", body: "Name and email for a free download. Card for a paid one. We never ask for what the product doesn't need." },
  { icon: Link2, title: "Clean product links", body: "visitmy.shop/you/my-guide. Yours to share. No random numbers stapled to the end." },
  { icon: Star, title: "Reviews that collect themselves", body: "After the download, buyers rate it and leave a line. You approve what shows. Social proof that compounds." },
  { icon: Library, title: "A library for your buyers", body: "Everything they've ever bought, from every creator, behind one magic link at visitmy.shop/me. No digging through email." },
  { icon: BarChart3, title: "Analytics on every plan", body: "Views, clicks per card, conversions, and where the traffic came from. Meta Pixel and Conversions API included." },
  { icon: MessageCircle, title: "Instagram DM keyword", body: "Give a product a keyword. We write the caption, the auto-reply, and the story CTA, ready to paste." },
  { icon: Palette, title: "Design controls that go deep", body: "Font pairs, layouts, colors, backgrounds, button and card shapes. Live preview. Guard-railed so it stays clean on a phone." },
];

const ROWS: { label: string; us: string | true; stan: string | false; linktree: string | false }[] = [
  { label: "Fonts, layouts, backgrounds", us: true, stan: "Theme + two colors", linktree: "Limited" },
  { label: "Clean product URLs", us: true, stan: "Numeric suffix", linktree: false },
  { label: "Buyer download library", us: true, stan: false, linktree: false },
  { label: "Reviews collected from buyers", us: true, stan: false, linktree: false },
  { label: "A free download asks for", us: "Name + email", stan: "Full mailing address", linktree: false },
  { label: "Pixel tracking on the base plan", us: true, stan: "$99 plan", linktree: "Paid plan" },
];

function Cell({ v, us }: { v: string | boolean; us?: boolean }) {
  if (v === true)
    return (
      <span className={`inline-grid h-7 w-7 place-content-center rounded-full ${us ? "bg-[var(--ld-orange)] text-white" : "bg-[rgb(17_17_17/0.08)]"}`}>
        <Check size={15} strokeWidth={2.5} />
      </span>
    );
  if (v === false)
    return (
      <span className="ld-muted inline-grid h-7 w-7 place-content-center rounded-full bg-[rgb(17_17_17/0.05)]">
        <X size={14} strokeWidth={2.25} />
      </span>
    );
  return <span className={us ? "font-semibold" : "ld-muted"}>{v}</span>;
}

export default async function Home() {
  const user = await getCurrentUser();
  const loginHref = loginPath("/app");
  const loginBase = loginHref.split("?")[0];
  const platforms = [
    ["Instagram", SOCIAL_ICONS.instagram],
    ["TikTok", SOCIAL_ICONS.tiktok],
    ["YouTube", SOCIAL_ICONS.youtube],
    ["X", SOCIAL_ICONS.x],
    ["Threads", SOCIAL_ICONS.threads],
    ["LinkedIn", SOCIAL_ICONS.linkedin],
  ] as const;

  return (
    <div className={`ld ${manrope.variable}`}>
      <LandingNav signedIn={Boolean(user)} loginHref={loginHref} />

      {/* ---------- hero ---------- */}
      <section className="ld-hero">
        <div className="ld-hero-grid" aria-hidden />
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 pt-14 pb-20 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8 lg:pt-20 lg:pb-28">
          <div className="ld-rise">
            <span className="ld-eyebrow">
              <span className="ld-eyebrow-dot" aria-hidden />
              For creators who sell from their bio
            </span>
            <h1 className="ld-heading mt-6 text-[2.9rem] sm:text-[3.8rem] lg:text-[4.6rem]">
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
                  <ArrowRight size={17} strokeWidth={2.25} />
                </Link>
              ) : (
                <ClaimForm loginBase={loginBase} />
              )}
            </div>
            <ul className="ld-muted mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {["No code", "Your own Stripe account", "Live in five minutes"].map((t) => (
                <li key={t} className="inline-flex items-center gap-1.5">
                  <Check size={15} strokeWidth={2.5} className="ld-orange" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="ld-rise py-6 lg:py-0" style={{ animationDelay: "120ms" }}>
            <HeroPhone />
          </div>
        </div>
      </section>

      {/* ---------- platforms ---------- */}
      <section className="border-y border-[var(--ld-line)] bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-5 py-10 sm:px-8 lg:flex-row lg:justify-between">
          <p className="ld-muted text-sm font-medium">One link for every bio you have.</p>
          <ul className="ld-platforms flex flex-wrap justify-center gap-2">
            {platforms.map(([label, Icon]) => (
              <li key={label}>
                <Icon className="h-4 w-4" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- three promises ---------- */}
      <section className="ld-ink">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 sm:px-8 md:grid-cols-3 md:gap-8">
          {[
            { big: "Name + email.", body: "That is the whole checkout for a free download. No mailing address, no captcha, no three checkboxes." },
            { big: "Seconds.", body: "Files and companion skills deliver the moment the payment clears. Every time, or the product can't be published." },
            { big: "Yours.", body: "Buyers pay through your own Stripe account. We never hold your balance." },
          ].map((s) => (
            <div key={s.big}>
              <div className="ld-heading text-[2.6rem] sm:text-[3rem]">
                <span className="ld-orange">{s.big}</span>
              </div>
              <p className="ld-muted mt-3 max-w-sm leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- feature rows ---------- */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl space-y-20 px-5 py-20 sm:px-8 lg:space-y-28 lg:py-28">
          {[
            {
              img: "/landing/scene-setup.jpg",
              kicker: "No code",
              title: "Live in five minutes.",
              body: "Claim your link, pick a theme, drag in a file. Set a price or make it free. Your store is at visitmy.shop/you before the coffee gets cold.",
            },
            {
              img: "/landing/scene-checkout.jpg",
              kicker: "Checkout",
              title: "A checkout that respects a $9 PDF.",
              body: "Name and email for a free download. Card for a paid one. Optional fields stay optional. Delivery fires on its own, with a link that keeps working from the buyer's library.",
              flip: true,
            },
            {
              img: "/landing/scene-payout.jpg",
              kicker: "Payments",
              title: "Your money goes to your Stripe.",
              body: "Connect your own Stripe account once. Buyers pay you directly, refunds are one click, and every product shows you the number you keep.",
            },
          ].map((row) => (
            <div key={row.title} className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${row.flip ? "lg:[&>*:first-child]:order-2" : ""}`}>
              <div className="overflow-hidden rounded-[28px] border border-[var(--ld-line)] bg-[var(--ld-cream)]">
                <Image src={row.img} alt="" width={1536} height={1024} className="aspect-[3/2] w-full object-cover" sizes="(min-width: 1024px) 560px, 100vw" />
              </div>
              <div>
                <div className="ld-orange text-sm font-semibold tracking-[0.14em] uppercase">{row.kicker}</div>
                <h2 className="ld-heading mt-3 text-[2.2rem] sm:text-[2.8rem]">{row.title}</h2>
                <p className="ld-muted mt-5 max-w-lg text-lg leading-relaxed">{row.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- feature grid ---------- */}
      <section id="features" className="scroll-mt-20">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
          <div className="max-w-2xl">
            <div className="ld-orange text-sm font-semibold tracking-[0.14em] uppercase">Not just another link in bio</div>
            <h2 className="ld-heading mt-3 text-[2.4rem] sm:text-[3.2rem]">Everything between the tap and the download.</h2>
            <p className="ld-muted mt-5 text-lg leading-relaxed">The storefront, the checkout, the delivery, the reviews, and the numbers. One place, one link.</p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="ld-card p-6">
                <div className="ld-icon">
                  <Icon size={19} strokeWidth={2.25} />
                </div>
                <h3 className="mt-5 text-[1.05rem] font-semibold tracking-tight">{title}</h3>
                <p className="ld-muted mt-2 text-[0.92rem] leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- themes ---------- */}
      <section id="themes" className="scroll-mt-20 border-y border-[var(--ld-line)] bg-white">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <div>
              <div className="ld-orange text-sm font-semibold tracking-[0.14em] uppercase">Design</div>
              <h2 className="ld-heading mt-3 text-[2.4rem] sm:text-[3.2rem]">Every store looks like you.</h2>
              <p className="ld-muted mt-5 text-lg leading-relaxed">
                Most bio-link stores look the same because they are. Start from a preset, then change the font pair, the layout, the colors, the background, the button shape. Live preview while you edit, still clean on a phone.
              </p>
              <Link href="/demo" className="ld-btn ld-btn-ghost mt-8">
                See a live store
                <ArrowRight size={16} strokeWidth={2.25} />
              </Link>
            </div>
            <ThemeCards />
          </div>
        </div>
      </section>

      {/* ---------- how it works ---------- */}
      <section>
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
          <h2 className="ld-heading max-w-2xl text-[2.4rem] sm:text-[3.2rem]">Three steps. Then post.</h2>
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { t: "Claim your link", b: "Pick the name that goes in your bio. It’s yours in ten seconds." },
              { t: "Upload a product", b: "Drag in the file, write two lines, set a price or make it free. Pick a theme while you're at it." },
              { t: "Drop it in your bio", b: "One link everywhere you post. Add a DM keyword and let the caption do the selling." },
            ].map((s, i) => (
              <li key={s.t} className="ld-card flex gap-5 p-6">
                <span className="ld-step-num shrink-0">{i + 1}</span>
                <div>
                  <h3 className="text-[1.05rem] font-semibold tracking-tight">{s.t}</h3>
                  <p className="ld-muted mt-1.5 text-[0.92rem] leading-relaxed">{s.b}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- compare ---------- */}
      <section id="compare" className="scroll-mt-20 border-t border-[var(--ld-line)] bg-white">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
          <div className="max-w-2xl">
            <div className="ld-orange text-sm font-semibold tracking-[0.14em] uppercase">Compare</div>
            <h2 className="ld-heading mt-3 text-[2.4rem] sm:text-[3.2rem]">Built for the digital-download wedge.</h2>
            <p className="ld-muted mt-5 text-lg leading-relaxed">We don’t do courses, bookings, or communities yet. We do the bio-link store better than anyone.</p>
          </div>
          <div className="ld-card mt-12 overflow-x-auto">
            <table className="ld-table w-full min-w-[560px]">
              <thead>
                <tr>
                  <th scope="col" />
                  <th scope="col" className="ld-us">
                    <span className="inline-flex items-center gap-1.5 normal-case">
                      <Wordmark size={15} />
                    </span>
                  </th>
                  <th scope="col">Stan</th>
                  <th scope="col">Linktree</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr key={r.label}>
                    <th scope="row">{r.label}</th>
                    <td className="ld-us">
                      <Cell v={r.us} us />
                    </td>
                    <td>
                      <Cell v={r.stan} />
                    </td>
                    <td>
                      <Cell v={r.linktree} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="ld-muted mt-4 flex items-center gap-1.5 text-xs">
            <Minus size={12} />
            Compared against published plans, September 2026.
          </p>
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
                <ArrowRight size={17} strokeWidth={2.25} />
              </Link>
            ) : (
              <ClaimForm loginBase={loginBase} tone="orange" />
            )}
          </div>
        </div>
      </section>

      {/* ---------- footer ---------- */}
      <footer className="ld-ink">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-12 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div>
            <Wordmark size={22} />
            <p className="ld-muted mt-2 text-sm">Sell digital products straight from your bio.</p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm" aria-label="Footer">
            <Link href="/demo" className="ld-muted hover:text-white">
              Demo store
            </Link>
            <Link href="/me" className="ld-muted hover:text-white">
              My downloads
            </Link>
            <Link href={user ? "/app" : loginHref} className="ld-muted hover:text-white">
              {user ? "Dashboard" : "Log in"}
            </Link>
          </nav>
          <p className="ld-muted text-xs">© {new Date().getFullYear()} visitmy.shop</p>
        </div>
      </footer>
    </div>
  );
}
