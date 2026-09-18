import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { SITE } from "@/lib/site";

const COLUMNS: { title: string; links: [string, string][] }[] = [
  { title: "Product", links: [["Features", "/features"], ["Pricing", "/pricing"], ["Demo store", "/demo"], ["Creators", "/creators"], ["FAQ", "/faq"], ["Changelog", "/changelog"]] },
  { title: "Compare", links: [["Stan store alternative", "/compare/stan-store"], ["Linktree alternative", "/compare/linktree"], ["Beacons alternative", "/compare/beacons"], ["Gumroad alternative", "/compare/gumroad"], ["All comparisons", "/compare"]] },
  { title: "Company", links: [["Sell digital products from your Instagram bio", "/guides/sell-digital-products-from-instagram-bio"], ["Privacy", "/privacy"], ["Terms", "/terms"]] },
];

export function MarketingFooter({ signedIn, loginHref }: { signedIn: boolean; loginHref: string }) {
  const instagram = SITE.profiles.find((p) => p.includes("instagram.com"));
  return (
    <footer className="ld-ink">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" aria-label="visitmy.shop home" className="inline-flex">
            <Wordmark size={22} />
          </Link>
          <p className="ld-muted mt-3 max-w-xs text-sm leading-relaxed">Sell downloads and book calls from your bio. Paid to your own Stripe, delivered in seconds.</p>
          <p className="mt-6 text-sm">
            <a href={`mailto:${SITE.email}`} className="ld-muted hover:text-white">
              {SITE.email}
            </a>
            {instagram && (
              <>
                <span className="ld-muted"> · </span>
                <a href={instagram} className="ld-muted hover:text-white" rel="noopener">
                  Instagram
                </a>
              </>
            )}
          </p>
        </div>
        {COLUMNS.map((c) => (
          <div key={c.title}>
            <div className="text-sm font-semibold">{c.title}</div>
            <ul className="mt-3 space-y-2 text-sm">
              {c.links.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="ld-muted hover:text-white">
                    {label}
                  </Link>
                </li>
              ))}
              {c.title === "Company" && (
                <li>
                  <Link href={signedIn ? "/app" : loginHref} className="ld-muted hover:text-white">
                    {signedIn ? "Dashboard" : "Log in"}
                  </Link>
                </li>
              )}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-2 border-t border-white/10 px-5 py-6 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="ld-muted">© {new Date().getFullYear()} visitmy.shop</p>
        <p className="ld-muted">
          Bought something?{" "}
          <Link href="/me" className="underline underline-offset-4 hover:text-white">
            Your downloads
          </Link>
        </p>
      </div>
    </footer>
  );
}
