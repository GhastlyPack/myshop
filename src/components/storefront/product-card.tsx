"use client";

import Link from "next/link";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { formatPrice } from "./price";
import { sendBeacon } from "./session";

export type CardProduct = {
  id: string;
  storeId: string;
  title: string;
  subtitle: string | null;
  priceCents: number;
  currency: string;
  buttonText: string;
  cardStyle: "button" | "callout" | "preview";
  thumbUrl: string | null;
  bannerUrl: string | null;
  href: string;
  external: boolean;
};

type Mode = "list" | "grid" | "hero";

function Cta({ text, external, small }: { text: string; external: boolean; small?: boolean }) {
  return (
    <span className={`sf-btn ${small ? "sf-btn-sm" : ""}`}>
      {text}
      {external ? <ArrowUpRight size={16} className="sf-card-arrow" /> : <ChevronRight size={16} className="sf-card-arrow" />}
    </span>
  );
}

/**
 * One product on the storefront. The whole card is the link; the CTA is visual.
 * Card styles: button (title + CTA), callout (thumb left), preview (image on top).
 * Grid mode compacts callouts into vertical tiles so 2-up fits at 375px.
 */
export function ProductCard({ product: p, mode = "list" }: { product: CardProduct; mode?: Mode }) {
  const price = formatPrice(p.priceCents, p.currency);
  const onClick = () => sendBeacon({ storeId: p.storeId, productId: p.id, type: "click" });
  const linkProps = p.external ? { target: "_blank", rel: "noreferrer" } : {};
  const style = mode === "hero" ? "preview" : mode === "grid" && p.cardStyle === "callout" ? "preview" : p.cardStyle;
  const image = p.bannerUrl ?? p.thumbUrl;

  if (style === "button") {
    return (
      <Link href={p.href} {...linkProps} onClick={onClick} className={`sf-card ${mode === "grid" ? "col-span-2" : ""}`}>
        <span className="flex items-center gap-3 px-5 py-4">
          <span className="sf-heading min-w-0 flex-1 text-[1.05rem]">{p.title}</span>
          {p.priceCents > 0 && <span className="sf-chip hidden sm:inline-flex">{price}</span>}
          <Cta text={p.buttonText} external={p.external} small />
        </span>
      </Link>
    );
  }

  if (style === "callout") {
    return (
      <Link href={p.href} {...linkProps} onClick={onClick} className="sf-card">
        <span className="flex gap-4 p-4 sm:p-5">
          {p.thumbUrl && (
            <span className="sf-thumb sf-thumb-sm">
              {/* eslint-disable-next-line @next/next/no-img-element -- creator upload */}
              <img src={p.thumbUrl} alt="" loading="lazy" />
            </span>
          )}
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="sf-heading text-[1.1rem]">{p.title}</span>
            {p.subtitle && <span className="sf-muted line-clamp-2 text-sm">{p.subtitle}</span>}
            <span className="mt-2 flex items-center justify-between gap-3">
              <span className="text-[0.95rem] font-semibold">{price}</span>
              <Cta text={p.buttonText} external={p.external} small />
            </span>
          </span>
        </span>
      </Link>
    );
  }

  // preview / hero / grid tile
  const hero = mode === "hero";
  const grid = mode === "grid";
  return (
    <Link href={p.href} {...linkProps} onClick={onClick} className={`sf-card ${hero ? "sf-rise" : ""}`}>
      {image && (
        <span className={`sf-thumb block ${grid ? "aspect-square" : hero ? "aspect-[4/3] sm:aspect-[16/9]" : "aspect-[16/9]"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- creator upload */}
          <img src={image} alt="" loading={hero ? "eager" : "lazy"} />
        </span>
      )}
      <span className={`flex flex-col ${grid ? "gap-1.5 p-3.5" : "gap-2 p-5 sm:p-6"}`}>
        <span className={`sf-heading ${hero ? "text-[1.5rem] sm:text-[1.75rem]" : grid ? "text-[1rem] leading-tight" : "text-[1.2rem]"}`}>{p.title}</span>
        {p.subtitle && !grid && <span className="sf-muted text-[0.95rem]">{p.subtitle}</span>}
        {grid ? (
          <>
            <span className="text-sm font-semibold">{price}</span>
            <span className="sf-btn sf-btn-sm mt-1 w-full">
              <span className="truncate">{p.buttonText}</span>
              {p.external ? <ArrowUpRight size={15} className="sf-card-arrow shrink-0" /> : <ChevronRight size={15} className="sf-card-arrow shrink-0" />}
            </span>
          </>
        ) : (
          <span className="mt-2 flex items-center justify-between gap-3">
            <span className="text-[1.05rem] font-semibold">{price}</span>
            <Cta text={p.buttonText} external={p.external} />
          </span>
        )}
      </span>
    </Link>
  );
}
