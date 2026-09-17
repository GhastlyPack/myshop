import type { Metadata } from "next";
import Link from "next/link";
import { Manrope } from "next/font/google";
import { Wordmark } from "@/components/brand/wordmark";
import { ClaimForm } from "@/components/landing/claim-form";
import { CheckoutMock, EditorMock, IncomeMock } from "@/components/landing/feature-mockups";
import { LandingNav } from "@/components/landing/nav";
import { HeroPhone } from "@/components/landing/phone";
import { ThemeCards } from "@/components/landing/theme-cards";
import { getCurrentUser, loginPath } from "@/lib/auth";
import "@/components/storefront/storefront.css";
import "@/components/landing/landing.css";

const manrope = Manrope({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: { absolute: "visitmy.shop — your bio link, but it actually sells" },
  description: "Sell digital products straight from your Instagram bio. Upload a file, drop one link, get paid to your own Stripe, delivered in seconds.",
};

const ROWS = [
  {
    mock: EditorMock,
    title: "Live in five minutes.",
    body: "Claim your link, pick a theme, drag in a file. Set a price or make it free. Your store is at visitmy.shop/you before the coffee gets cold. No code, no plugins, nothing to install.",
  },
  {
    mock: CheckoutMock,
    title: "A checkout that respects a $9 PDF.",
    body: "Name and email for a free download. Card for a paid one. No mailing address, no captcha, no three checkboxes. The file lands in seconds and stays in the buyer’s library for good.",
    flip: true,
  },
  {
    mock: IncomeMock,
    title: "Your money goes to your Stripe.",
    body: "Connect your own Stripe account once. Buyers pay you directly, we never hold your balance, and every product shows you the number you keep.",
  },
];

const FEATURES = [
  ["Any product, free or paid", "A lead magnet or a $39 manual, listed on your store or hidden as its own landing page. Files, links, companion skills."],
  ["Clean product links", "visitmy.shop/you/my-guide. No random numbers stapled to the end."],
  ["Reviews from buyers", "After the download, buyers rate it and leave a line. You approve what shows."],
  ["A library for your buyers", "Everything they’ve ever bought, from every creator, behind one magic link at visitmy.shop/me."],
  ["Analytics on every plan", "Views, clicks per card, conversions, and where the traffic came from. Meta Pixel and Conversions API included."],
  ["Instagram DM keyword", "Give a product a keyword and get the caption, the auto-reply, and the story CTA, ready to paste."],
];

const COMPARE = [
  ["Fonts, layouts, backgrounds", "Full control", "Theme and two colors", "Limited"],
  ["Product URLs", "visitmy.shop/you/my-guide", "Numeric suffix", "None"],
  ["Buyer download library", "Yes", "No", "No"],
  ["Reviews collected from buyers", "Yes", "No", "No"],
  ["A free download asks for", "Name and email", "Full mailing address", "n/a"],
  ["Pixel tracking", "Every plan", "$99 plan", "Paid plan"],
];

export default async function Home() {
  const user = await getCurrentUser();
  const loginHref = loginPath("/app");
  const loginBase = loginHref.split("?")[0];

  return (
    <div className={`ld ${manrope.variable}`}>
      <LandingNav signedIn={Boolean(user)} loginHref={loginHref} />

      {/* ---------- hero ---------- */}
      <section>
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 pt-16 pb-20 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8 lg:pt-24 lg:pb-28">
          <div>
            <h1 className="ld-heading text-[2.9rem] sm:text-[3.8rem] lg:text-[4.4rem]">
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
            <p className="ld-muted mt-6 text-sm">No code. Your own Stripe account. Live in five minutes.</p>
          </div>
          <div className="py-4 lg:py-0">
            <HeroPhone />
          </div>
        </div>
      </section>

      {/* ---------- feature rows ---------- */}
      <section className="border-t ld-line bg-white">
        <div className="mx-auto max-w-6xl space-y-20 px-5 py-20 sm:px-8 lg:space-y-28 lg:py-28">
          {ROWS.map((row) => (
            <div key={row.title} className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${row.flip ? "lg:[&>*:first-child]:order-2" : ""}`}>
              <div className="min-w-0">
                <row.mock />
              </div>
              <div>
                <h2 className="ld-heading text-[2.2rem] sm:text-[2.8rem]">{row.title}</h2>
                <p className="ld-muted mt-5 max-w-lg text-lg leading-relaxed">{row.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- feature list ---------- */}
      <section id="features" className="scroll-mt-20 border-t ld-line">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
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
          <Link href="/demo" className="ld-btn ld-btn-ghost mt-10">
            See a live store
          </Link>
        </div>
      </section>

      {/* ---------- compare ---------- */}
      <section id="compare" className="scroll-mt-20 border-t ld-line">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <div>
              <h2 className="ld-heading text-[2.4rem] sm:text-[3rem]">How it compares.</h2>
              <p className="ld-muted mt-5 max-w-md text-lg leading-relaxed">We don’t do courses, bookings, or communities yet. We do the bio-link store better than anyone.</p>
              <p className="ld-muted mt-5 text-sm">Compared against published plans, September 2026.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="ld-table w-full min-w-[560px]">
                <thead>
                  <tr>
                    <th scope="col" />
                    <th scope="col">
                      <Wordmark size={15} />
                    </th>
                    <th scope="col">Stan</th>
                    <th scope="col">Linktree</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE.map(([label, us, stan, linktree]) => (
                    <tr key={label}>
                      <th scope="row" className="font-medium">
                        {label}
                      </th>
                      <td className="ld-us">{us}</td>
                      <td>{stan}</td>
                      <td>{linktree}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
