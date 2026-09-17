import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · admin · visitmy.shop" } };
export const dynamic = "force-dynamic";

/** /admin lives outside the /app shell: minimal header, back link, read-only pages. Every page also calls requireAdmin(). */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-dvh bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-12 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-8">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="flex items-center gap-1.5 text-sm font-semibold tracking-tight">
              <ShieldCheck className="size-4" /> visitmy.shop admin
            </Link>
            <nav className="flex items-center gap-3 text-sm text-muted-foreground">
              <Link href="/admin" className="hover:text-foreground">
                Overview
              </Link>
              <Link href="/admin/stores" className="hover:text-foreground">
                Stores
              </Link>
              <Link href="/admin/team" className="hover:text-foreground">
                Team
              </Link>
            </nav>
          </div>
          <Link href="/app" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3" /> Back to app
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-10">{children}</main>
    </div>
  );
}
