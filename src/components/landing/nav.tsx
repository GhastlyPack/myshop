import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { MobileMenu } from "./mobile-menu";

const links = [
  { href: "/#themes", label: "Themes" },
  { href: "/pricing", label: "Pricing" },
  { href: "/compare", label: "Compare" },
  { href: "/creators", label: "Creators" },
  { href: "/demo", label: "Demo store" },
];

export function LandingNav({ signedIn, loginHref }: { signedIn: boolean; loginHref: string }) {
  return (
    <header className="relative sticky top-0 z-40 border-b ld-line bg-[var(--ld-tint)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <Link href="/" className="shrink-0" aria-label="visitmy.shop home">
          <Wordmark size={22} />
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium md:flex" aria-label="Primary">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="ld-muted transition-colors hover:text-[var(--ld-ink)]">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {signedIn ? (
            <Link href="/app" className="ld-btn ld-btn-sm ld-btn-ink">
              Open dashboard
            </Link>
          ) : (
            <>
              <Link href={loginHref} className="ld-btn ld-btn-sm ld-btn-ghost hidden sm:inline-flex">
                Log in
              </Link>
              <Link href={loginHref} className="ld-btn ld-btn-sm ld-btn-primary">
                Claim your link
              </Link>
            </>
          )}
          <MobileMenu links={links} loginHref={loginHref} signedIn={signedIn} />
        </div>
      </div>
    </header>
  );
}
