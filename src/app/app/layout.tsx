import type { Metadata } from "next";
import { AppNav, MobileNav } from "@/components/app/nav";
import { GaEvent } from "@/components/analytics/ga-event";
import { getCurrentStore, logoutPath, requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const store = await getCurrentStore();
  const navProps = {
    user: { email: user.email, name: user.name, role: user.role },
    store: store ? { username: store.username, displayName: store.displayName } : null,
    logoutHref: logoutPath(),
  };
  return (
    <div className="flex min-h-dvh flex-col bg-muted/30 sm:flex-row">
      <GaEvent name="login" session="login" params={{ method: "auth0", has_store: Boolean(store) }} user={{ user_role: user.role, has_store: Boolean(store) }} />
      <MobileNav {...navProps} />
      <AppNav {...navProps} />
      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-10">{children}</div>
      </main>
    </div>
  );
}
