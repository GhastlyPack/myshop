"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ExternalLink, LayoutGrid, LogOut, Palette, Settings, ShieldCheck, Users, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/app", label: "My store", icon: LayoutGrid, exact: true },
  { href: "/app/design", label: "Design", icon: Palette },
  { href: "/app/customers", label: "Customers", icon: Users },
  { href: "/app/income", label: "Income", icon: Wallet },
  { href: "/app/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export function AppNav({
  user,
  store,
  logoutHref,
}: {
  user: { email: string; name: string | null; role: "creator" | "admin" };
  store: { username: string; displayName: string } | null;
  logoutHref: string;
}) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-background sm:flex">
      <div className="px-5 py-5">
        <Link href="/app" className="text-sm font-semibold tracking-tight">
          visitmy.shop
        </Link>
        {store && (
          <a
            href={`/${store.username}`}
            target="_blank"
            rel="noreferrer"
            className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            /{store.username} <ExternalLink className="size-3" />
          </a>
        )}
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        {items.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
        {user.role === "admin" && (
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground",
              pathname.startsWith("/admin") && "bg-muted font-medium text-foreground",
            )}
          >
            <ShieldCheck className="size-4" />
            Admin
          </Link>
        )}
      </nav>
      <div className="border-t px-5 py-4 text-xs">
        <div className="truncate font-medium">{user.name ?? user.email}</div>
        <div className="truncate text-muted-foreground">{user.email}</div>
        <a href={logoutHref} className="mt-2 inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <LogOut className="size-3" /> Sign out
        </a>
      </div>
    </aside>
  );
}
