import { AppNav } from "@/components/app/nav";
import { getCurrentStore, logoutPath, requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const store = await getCurrentStore();
  return (
    <div className="flex min-h-dvh bg-muted/30">
      <AppNav user={{ email: user.email, name: user.name, role: user.role }} store={store ? { username: store.username, displayName: store.displayName } : null} logoutHref={logoutPath()} />
      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-10">{children}</div>
      </main>
    </div>
  );
}
