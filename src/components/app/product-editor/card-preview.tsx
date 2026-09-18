"use client";

import type { CSSProperties } from "react";
import { ProductCard, type CardProduct } from "@/components/storefront/product-card";
import { googleFontsHref, themeToCssVars, type ResolvedTheme } from "@/lib/theme";
import type { ProductInput } from "@/lib/product-input";
import "@/components/storefront/storefront.css";

/**
 * Live preview of how the product reads on the storefront, driven by the editor's form
 * state: the card as it appears in the store's list, plus the product page's opening
 * (title, subtitle, description, button). Applies the store theme's --sf-* variables to
 * a scoped wrapper (not ThemeRoot, whose fixed full-page background would cover the
 * dashboard). Inert: clicks are swallowed so the card's analytics/nav never fire.
 */
export function CardPreview({
  form,
  theme,
  thumbnailUrl,
  bannerUrl,
  currency,
}: {
  form: ProductInput;
  theme: ResolvedTheme;
  thumbnailUrl: string | null;
  bannerUrl: string | null;
  currency: string;
}) {
  const vars = themeToCssVars(theme) as CSSProperties;
  const product: CardProduct = {
    id: "preview",
    storeId: "preview",
    title: form.title || "Untitled product",
    subtitle: form.subtitle || null,
    priceCents: Number(form.priceCents) || 0,
    currency,
    buttonText: form.buttonText || "Get it",
    cardStyle: form.cardStyle,
    thumbUrl: thumbnailUrl,
    bannerUrl,
    href: "#",
    external: form.type === "link",
    remaining: form.quantityLimit ?? null,
  };
  const description = (form.description || "").replace(/[#*_`>]/g, "").trim();
  const excerpt = description.length > 240 ? `${description.slice(0, 240).trimEnd()}…` : description;

  return (
    <div className="space-y-3">
      <link rel="stylesheet" href={googleFontsHref(theme)} />
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Preview</span>
        <span className="text-xs text-muted-foreground">Updates as you type</span>
      </div>

      {/* Scoped storefront surface: same variables ThemeRoot sets, without its page-level chrome. */}
      <div
        className="overflow-hidden rounded-xl border"
        style={{ ...vars, background: "var(--sf-bg)", backgroundImage: "var(--sf-bg-gradient)", color: "var(--sf-text)", fontFamily: "var(--sf-body-font)" }}
        onClickCapture={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <div className="p-4">
          <p className="mb-2 text-[10px] uppercase tracking-wide" style={{ color: "var(--sf-muted)", opacity: 0.8 }}>
            On your store
          </p>
          <ProductCard product={product} mode="list" />
        </div>

        <div className="border-t p-4" style={{ borderColor: "color-mix(in srgb, var(--sf-text) 12%, transparent)" }}>
          <p className="mb-2 text-[10px] uppercase tracking-wide" style={{ color: "var(--sf-muted)", opacity: 0.8 }}>
            Product page
          </p>
          <h3 className="sf-heading text-[1.15rem] leading-tight">{product.title}</h3>
          {product.subtitle && <p className="sf-muted mt-1 text-sm">{product.subtitle}</p>}
          {excerpt ? <p className="mt-3 text-[0.9rem] leading-relaxed">{excerpt}</p> : <p className="sf-muted mt-3 text-sm italic">Add a description to see it here.</p>}
          <span className="sf-btn mt-4 inline-flex text-sm">{form.type === "booking" ? form.buttonText || "Book a call" : product.buttonText}</span>
        </div>
      </div>
    </div>
  );
}
