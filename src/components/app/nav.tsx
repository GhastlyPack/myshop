"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BarChart3, ExternalLink, LayoutGrid, LogOut, Menu, MessageSquareText, Palette, Settings, ShieldCheck, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Wordmark } from "@/components/brand/wordmark";
import { cn } from "@/lib/utils";

const items = [
  { href: "/app", label: "My store", icon: LayoutGrid, exact: true },
  { href: "/app/design", label: "Design", icon: Palette },
  { href: "/app/customers", label: "Customers", icon: Users },
  { href: "/app/income", label: "Income", icon: Wallet },
  { href: "/app/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/app/reviews", label: "Reviews", icon: MessageSquareText },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

type NavProps = {
  user: { email: string; name: string | null; role: "creator" | "admin" };
  store: { username: string; displayName: string } | null;
  logoutHref: string;
};

function NavLinks({ user, onNavigate }: { user: NavProps["user"]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-0.5 px-3">
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
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
          onClick={onNavigate}
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
  );
}

function StoreLink({ store }: { store: NavProps["store"] }) {
  if (!store) return null;
  return (
    <a href={`/${store.username}`} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
      /{store.username} <ExternalLink className="size-3" />
    </a>
  );
}

function UserFooter({ user, logoutHref }: Pick<NavProps, "user" | "logoutHref">) {
  return (
    <div className="border-t px-5 py-4 text-xs">
      <div className="truncate font-medium">{user.name ?? user.email}</div>
      <div className="truncate text-muted-foreground">{user.email}</div>
      <a href={logoutHref} className="mt-2 inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
        <LogOut className="size-3" /> Sign out
      </a>
    </div>
  );
}

/** Desktop sidebar (sm and up). */
export function AppNav({ user, store, logoutHref }: NavProps) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-background sm:flex">
      <div className="px-5 py-5">
        <Link href="/app" className="inline-flex" aria-label="visitmy.shop">
          <Wordmark size={18} />
        </Link>
        <StoreLink store={store} />
      </div>
      <NavLinks user={user} />
      <UserFooter user={user} logoutHref={logoutHref} />
    </aside>
  );
}

/** Phone top bar with a slide-in menu (below sm). */
export function MobileNav({ user, store, logoutHref }: NavProps) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur sm:hidden">
      <div className="min-w-0">
        <Link href="/app" className="inline-flex" aria-label="visitmy.shop">
          <Wordmark size={18} />
        </Link>
        <StoreLink store={store} />
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Open menu">
            <Menu className="size-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex w-72 flex-col p-0">
          <SheetTitle className="px-5 pt-5">
            <Wordmark size={18} />
          </SheetTitle>
          <div className="px-5 pb-3">
            <StoreLink store={store} />
          </div>
          <NavLinks user={user} onNavigate={() => setOpen(false)} />
          <UserFooter user={user} logoutHref={logoutHref} />
        </SheetContent>
      </Sheet>
    </header>
  );
}
