"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const MORE = [
  { href: "/faq", label: "FAQ" },
  { href: "/creators", label: "Creators" },
  { href: "/changelog", label: "Changelog" },
];

/** Phone-width nav: one button, the primary links, then the footer's pages, then the account link. */
export function MobileMenu({ links, loginHref, signedIn }: { links: { href: string; label: string }[]; loginHref: string; signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const item = "block rounded-lg px-3 py-2.5 hover:bg-white";
  return (
    <div className="md:hidden">
      <button type="button" aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((o) => !o)} className="ld-btn ld-btn-sm ld-btn-ghost !px-2.5">
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>
      {open && (
        <div id="mobile-menu" className="absolute inset-x-0 top-full border-b ld-line bg-[var(--ld-tint)] px-5 pt-3 pb-5">
          <ul className="flex flex-col gap-0.5 text-base font-medium">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setOpen(false)} className={item}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <ul className="ld-muted mt-2 flex flex-col gap-0.5 border-t ld-line pt-2 text-sm">
            {MORE.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setOpen(false)} className={item}>
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href={signedIn ? "/app" : loginHref} onClick={() => setOpen(false)} className={item}>
                {signedIn ? "Dashboard" : "Log in"}
              </Link>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
