"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

/** Phone-width nav: one button, a plain list. Desktop shows the links inline instead. */
export function MobileMenu({ links, loginHref, signedIn }: { links: { href: string; label: string }[]; loginHref: string; signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <button type="button" aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((o) => !o)} className="ld-btn ld-btn-sm ld-btn-ghost !px-2.5">
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>
      {open && (
        <div id="mobile-menu" className="absolute inset-x-0 top-full border-b ld-line bg-[var(--ld-tint)] px-5 py-4">
          <ul className="flex flex-col gap-1 text-base font-medium">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 hover:bg-white">
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href={signedIn ? "/app" : loginHref} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 hover:bg-white">
                {signedIn ? "Dashboard" : "Log in"}
              </Link>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
