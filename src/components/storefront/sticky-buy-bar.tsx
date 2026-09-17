"use client";

import { useEffect, useState } from "react";

/**
 * Phone-only bar with the price and a button that scrolls to #checkout.
 * Shows once the checkout section has scrolled out of view (either direction).
 */
export function StickyBuyBar({ price, label }: { price: string; label: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const target = document.getElementById("checkout");
    if (!target) return;
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting), { rootMargin: "0px 0px -20% 0px" });
    io.observe(target);
    return () => io.disconnect();
  }, []);
  if (!show) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t px-4 py-3 sm:hidden" style={{ background: "var(--sf-surface)", borderColor: "color-mix(in srgb, var(--sf-text) 12%, transparent)" }}>
      <div className="mx-auto flex max-w-[640px] items-center justify-between gap-4">
        <span className="text-[1.05rem] font-semibold">{price}</span>
        <a href="#checkout" className="sf-btn" onClick={(e) => { e.preventDefault(); document.getElementById("checkout")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
          {label}
        </a>
      </div>
    </div>
  );
}
