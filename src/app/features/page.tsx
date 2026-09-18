import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { existsSync } from "node:fs";
import path from "node:path";
import { ClaimForm } from "@/components/landing/claim-form";
import { MarketingShell } from "@/components/landing/shell";
import { getCurrentUser, loginPath } from "@/lib/auth";
import { CHAPTERS, HERO_ART, type Chapter } from "@/lib/features";
import { VsOthers } from "@/components/landing/vs-others";
import { COMPETITORS, PLANS } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Everything visitmy.shop does: digital downloads, lead magnets, pricing tiers, pay what you want, order bumps, booking calls with Google Calendar and Meet, Instagram keyword auto-replies, Meta/Google/TikTok pixels, a full design editor, and instant delivery with a buyer library.",
  alternates: { canonical: "/features" },
};

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
              The other guys charge ${COMPETITORS.stan.entry} to start and ${COMPETITORS.stan.top} for the good stuff.
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
            <nav aria-label="On this page" className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t ld-line pt-4 text-sm font-medium">
              <span className="ld-muted">On this page</span>
              {CHAPTERS.map((c) => (
                <a key={c.key} href={`#${c.key}`} className="underline-offset-4 hover:text-[var(--ld-orange-ink)] hover:underline">
                  {c.eyebrow}
                </a>
              ))}
            </nav>
          </div>
          <Art art={HERO_ART} priority />
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

      <VsOthers />

      {/* ---------- final CTA ---------- */}
      <section className="ld-orange-band">
        <div className="mx-auto flex max-w-6xl flex-col items-center px-5 py-20 text-center sm:px-8 lg:py-28">
          <h2 className="ld-heading text-[2.6rem] sm:text-[3.6rem]">All of it, from ${PLANS[0].monthly} a month.</h2>
          <p className="ld-muted mt-5 max-w-lg text-lg">Design your store free. Add a card when you publish and your first 7 days are Pro.</p>
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
    </MarketingShell>
  );
}
