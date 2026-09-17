import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";

const COLUMNS: { title: string; links: [string, string][] }[] = [
  { title: "Product", links: [["Pricing", "/pricing"], ["FAQ", "/faq"], ["Demo store", "/demo"], ["Creators", "/creators"], ["Changelog", "/changelog"]] },
  { title: "Compare", links: [["Stan store alternative", "/compare/stan-store"], ["Linktree alternative", "/compare/linktree"], ["Beacons alternative", "/compare/beacons"], ["Gumroad alternative", "/compare/gumroad"], ["All comparisons", "/compare"]] },
  { title: "Learn", links: [["Sell digital products from your Instagram bio", "/guides/sell-digital-products-from-instagram-bio"], ["My downloads", "/me"]] },
];

export function MarketingFooter({ signedIn, loginHref }: { signedIn: boolean; loginHref: string }) {
  return (
    <footer className="ld-ink">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" aria-label="visitmy.shop home" className="inline-flex">
            <Wordmark size={22} />
          </Link>
          <p className="ld-muted mt-3 max-w-xs text-sm leading-relaxed">Sell digital products straight from your bio. Paid to your own Stripe, delivered in seconds.</p>
          <p className="ld-muted mt-6 text-xs">© {new Date().getFullYear()} visitmy.shop</p>
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
              {c.title === "Learn" && (
                <>
                  <li>
                    <Link href="/privacy" className="ld-muted hover:text-white">
                      Privacy
                    </Link>
                  </li>
                  <li>
                    <Link href="/terms" className="ld-muted hover:text-white">
                      Terms
                    </Link>
                  </li>
                  <li>
                    <Link href={signedIn ? "/app" : loginHref} className="ld-muted hover:text-white">
                      {signedIn ? "Dashboard" : "Log in"}
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  );
}
