import type { Metadata } from "next";
import Link from "next/link";
import { AppNav, MobileNav } from "@/components/app/nav";
import { GaEvent } from "@/components/analytics/ga-event";
import { getCurrentStore, logoutPath, requireUser } from "@/lib/auth";
import { resolvePlan } from "@/lib/billing";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const store = await getCurrentStore();
  // Slim nag when a store is on Basic terms with no active subscription (not grandfathered).
  // A draft (unpublished) store is prompted to add a card and go live; a live Basic store is
  // prompted to upgrade; a store that already trialed and lapsed is told the trial ended.
  const plan = store ? await resolvePlan(store) : null;
  const nag = Boolean(plan && plan.tier === "basic" && plan.status !== "active");
  const neverTrialed = !plan?.trialEndsAt;
  const isDraft = Boolean(store && !store.published);
  const nagText = isDraft
    ? "Your store is a draft — nobody can see it yet. Add a card to start your free 7-day Pro trial and go live."
    : neverTrialed
      ? "You're on Basic terms (5% fee). Start your free 7-day Pro trial for 0% fees."
      : "Your free trial has ended. You're on Basic terms (5% fee).";
  const nagCta = isDraft ? "Start free trial" : neverTrialed ? "Start free trial" : "Upgrade to Pro";
  const navProps = {
    user: { email: user.email, name: user.name, role: user.role },
    store: store ? { username: store.username, displayName: store.displayName } : null,
    logoutHref: logoutPath(),
  };
  return (
    <div className="flex min-h-dvh flex-col bg-[#f1f4f8] sm:flex-row">
      <GaEvent name="login" session="login" params={{ method: "auth0", has_store: Boolean(store) }} user={{ user_role: user.role, has_store: Boolean(store) }} />
      <MobileNav {...navProps} />
      <AppNav {...navProps} />
      <main className="min-w-0 flex-1">
        {nag && (
          <div className="border-b bg-amber-50 px-4 py-2.5 text-sm text-amber-900 sm:px-8 dark:bg-amber-950/40 dark:text-amber-200">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
              <span>{nagText}</span>
              <Link href="/app/billing" className="font-semibold underline underline-offset-2">
                {nagCta}
              </Link>
            </div>
          </div>
        )}
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-10">{children}</div>
      </main>
    </div>
  );
}
