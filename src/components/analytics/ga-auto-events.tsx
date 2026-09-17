"use client";

import { useEffect } from "react";
import { ga } from "@/lib/ga";

/**
 * One delegated click listener for events that don't deserve a component each:
 * file downloads, outbound links, creator social links, marketing CTAs, and the Stripe connect button.
 */
export function GaAutoEvents() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href], button") as HTMLAnchorElement | HTMLButtonElement | null;
      if (!a) return;
      const href = a instanceof HTMLAnchorElement ? a.getAttribute("href") ?? "" : "";
      const text = (a.textContent ?? "").trim().slice(0, 60);
      const page = window.location.pathname;

      if (href.startsWith("/d/")) {
        ga("file_download", { file_name: text, page });
        return;
      }
      if (href.startsWith("/api/payments/stripe/connect")) {
        ga("stripe_connect_start", { page });
        return;
      }
      if (href.startsWith("/api/instagram/connect")) {
        ga("instagram_connect_start", { page });
        return;
      }
      if (a.classList.contains("sf-social")) {
        ga("social_click", { network: a.getAttribute("aria-label") ?? "unknown", link_url: href, page });
        return;
      }
      if (a.classList.contains("ld-btn") || a.closest(".ld-claim")) {
        ga("cta_click", { label: text, link_url: href, page });
      }
      if (/^https?:\/\//.test(href)) {
        try {
          const u = new URL(href);
          if (u.host !== window.location.host) ga("click_outbound", { link_url: href, link_domain: u.host, link_text: text, page });
        } catch {}
      }
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);
  return null;
}
