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

/** Long-form page body: title and intro on the tint, the prose on a white surface below. */
export function Article({ title, intro, updated, children }: { title: string; intro?: string; updated?: string; children: ReactNode }) {
  return (
    <main>
      <div className="mx-auto max-w-3xl px-5 pt-16 pb-12 sm:px-8 lg:pt-24 lg:pb-16">
        <h1 className="ld-heading text-[2.6rem] sm:text-[3.4rem]">{title}</h1>
        {intro && <p className="ld-muted mt-6 text-xl leading-relaxed">{intro}</p>}
        {updated && <p className="ld-muted mt-4 text-sm">Updated {updated}</p>}
      </div>
      <div className="border-t ld-line bg-white">
        <div className="ld-prose mx-auto max-w-3xl px-5 py-12 sm:px-8 lg:py-16">{children}</div>
      </div>
    </main>
  );
}
