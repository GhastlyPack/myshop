import type { ReactNode } from "react";
import { getCurrentUser, loginPath } from "@/lib/auth";
import { manrope } from "./fonts";
import { MarketingFooter } from "./footer";
import { LandingNav } from "./nav";
import "@/components/storefront/storefront.css";
import "./landing.css";

/** Nav + footer wrapper for every marketing page (lander, pricing, compare, guides, FAQ). */
export async function MarketingShell({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const loginHref = loginPath("/app");
  return (
    <div className={`ld ${manrope.variable}`}>
      <LandingNav signedIn={Boolean(user)} loginHref={loginHref} />
      {children}
      <MarketingFooter signedIn={Boolean(user)} loginHref={loginHref} />
    </div>
  );
}

/** Long-form page body: title, intro, prose. */
export function Article({ title, intro, updated, children }: { title: string; intro?: string; updated?: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16 sm:px-8 lg:py-24">
      <h1 className="ld-heading text-[2.6rem] sm:text-[3.4rem]">{title}</h1>
      {intro && <p className="ld-muted mt-6 text-xl leading-relaxed">{intro}</p>}
      {updated && <p className="ld-muted mt-4 text-sm">Updated {updated}</p>}
      <div className="ld-prose mt-12">{children}</div>
    </main>
  );
}
