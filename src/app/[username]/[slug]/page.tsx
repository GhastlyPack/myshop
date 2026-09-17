import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import Markdown from "react-markdown";
import { ArrowUpRight } from "lucide-react";
import { CheckoutForm, type BumpOffer } from "@/components/storefront/checkout-form";
import { StoreFooter } from "@/components/storefront/footer";
import { resolveStoreTheme } from "@/components/storefront/preview-theme";
import { formatPrice } from "@/components/storefront/price";
import { Stars } from "@/components/storefront/stars";
import { CompactStoreHeader } from "@/components/storefront/store-header";
import { ProductCard, type CardProduct } from "@/components/storefront/product-card";
import { JsonLd } from "@/components/seo/json-ld";
import { absoluteUrl } from "@/lib/site";
import type { Product } from "@/db/schema";
import { ThemeRoot } from "@/components/storefront/theme-root";
import { TrackView } from "@/components/storefront/track-view";
import { PixelEvent } from "@/components/storefront/pixel-event";
import { bumpPrice, defaultBumpHeadline, isSoldOut, LOW_STOCK_AT, remainingUnits } from "@/lib/commerce";
import { findProductByPreviousSlug, getPublicProduct, getPublicStoreTagged } from "@/lib/queries";
import { publicUrl } from "@/lib/storage";

type Props = { params: Promise<{ username: string; slug: string }>; searchParams: Promise<{ lp?: string; previewTheme?: string | string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username, slug } = await params;
  const data = await getPublicProduct(username, slug);
  if (!data) return { title: "Not found" };
  const { store, product } = data;
  const title = `${product.title} · ${store.displayName}`;
  const description = product.subtitle ?? product.description?.slice(0, 160) ?? undefined;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/${store.username}/${product.slug}` },
    openGraph: { title, description, url: `/${store.username}/${product.slug}` },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const [{ username, slug }, sp] = await Promise.all([params, searchParams]);
  const data = await getPublicProduct(username, slug);
  if (!data) {
    // Renamed slug? Old links in bios and captions keep working.
    const moved = await findProductByPreviousSlug(username, slug);
    if (moved) permanentRedirect(`/${username.toLowerCase()}/${moved.slug}`);
    notFound();
  }
  const { store, product, files, links, reviews, bump } = data;
  const siblings = (await getPublicStoreTagged(username))?.products.filter((p) => p.id !== product.id).slice(0, 4) ?? [];
  const { theme, isPreview } = await resolveStoreTheme(store, sp.previewTheme);
  const remaining = remainingUnits(product);
  const soldOut = isSoldOut(product);
  const bumpOffer: BumpOffer | null =
    bump && product.priceCents > 0 && !isSoldOut(bump)
      ? {
          productId: bump.id,
          title: bump.title,
          headline: product.bumpHeadline?.trim() || defaultBumpHeadline(bump.title, formatPrice(bumpPrice(bump, product.bumpDiscountPercent), bump.currency)),
          thumbUrl: publicUrl(bump.thumbnailKey),
          priceCents: bump.priceCents,
          bumpCents: bumpPrice(bump, product.bumpDiscountPercent),
        }
      : null;
  const landing = sp.lp === "1";
  const banner = publicUrl(product.bannerKey);
  const thumb = publicUrl(product.thumbnailKey);
  const avg = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0;
  const isLink = product.type === "link";
  const pageUrl = absoluteUrl(`/${store.username}/${product.slug}`);
  const abs = (u: string | null) => (u ? (u.startsWith("http") ? u : absoluteUrl(u)) : undefined);
  const productLd: Record<string, unknown> = isLink
    ? { "@context": "https://schema.org", "@type": "WebPage", name: product.title, description: product.subtitle ?? undefined, url: pageUrl }
    : {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.title,
        description: product.subtitle ?? product.description?.slice(0, 300) ?? undefined,
        image: [abs(banner), abs(thumb)].filter(Boolean),
        url: pageUrl,
        brand: { "@type": "Person", name: store.displayName },
        offers: {
          "@type": "Offer",
          url: pageUrl,
          price: (product.priceCents / 100).toFixed(2),
          priceCurrency: product.currency.toUpperCase(),
          availability: soldOut ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
          seller: { "@type": "Person", name: store.displayName },
        },
        ...(reviews.length
          ? {
              aggregateRating: { "@type": "AggregateRating", ratingValue: avg.toFixed(1), reviewCount: reviews.length, bestRating: 5, worstRating: 1 },
              review: reviews.slice(0, 5).map((r) => ({
                "@type": "Review",
                reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
                author: { "@type": "Person", name: r.reviewerName ?? "Verified buyer" },
                reviewBody: r.quote ?? undefined,
              })),
            }
          : {}),
      };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: store.displayName, item: absoluteUrl(`/${store.username}`) },
      { "@type": "ListItem", position: 2, name: product.title, item: pageUrl },
    ],
  };
  const toCard = (p: Product): CardProduct => ({
    id: p.id,
    storeId: store.id,
    title: p.title,
    subtitle: p.subtitle,
    priceCents: p.priceCents,
    currency: p.currency,
    buttonText: p.buttonText,
    cardStyle: p.cardStyle === "preview" ? "callout" : p.cardStyle,
    thumbUrl: publicUrl(p.thumbnailKey),
    bannerUrl: null,
    href: `/${store.username}/${p.slug}`,
    external: false,
  });

  return (
    <ThemeRoot theme={theme}>
      <JsonLd data={productLd} />
      <JsonLd data={breadcrumbLd} />
      {!isPreview && <TrackView storeId={store.id} productId={product.id} type="product_view" />}
      {!isPreview && (
        <PixelEvent
          event="ViewContent"
          params={{ content_ids: [product.id], content_name: product.title, content_type: "product", currency: product.currency, value: product.priceCents / 100 }}
        />
      )}
      <main className="mx-auto w-full max-w-[640px] px-4 pt-6 pb-6 sm:px-6 sm:pt-8">
        {!landing && <CompactStoreHeader store={store} theme={theme} />}

        <article className={`sf-rise ${landing ? "mt-4" : "mt-8"}`}>
          {banner ? (
            <div className="sf-thumb aspect-[16/9] w-full" style={{ borderRadius: "var(--sf-card-radius)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- creator upload */}
              <img src={banner} alt={product.title} fetchPriority="high" decoding="async" />
            </div>
          ) : thumb ? (
            <div className="sf-thumb aspect-square w-32 sm:w-40" style={{ borderRadius: "var(--sf-card-radius)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- creator upload */}
              <img src={thumb} alt={product.title} fetchPriority="high" decoding="async" />
            </div>
          ) : null}

          <header className="mt-6 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="sf-chip">{isLink ? "Link" : formatPrice(product.priceCents, product.currency)}</span>
              {!isLink && soldOut && (
                <span className="sf-stock" data-out="true">
                  Sold out
                </span>
              )}
              {!isLink && !soldOut && remaining != null && remaining <= LOW_STOCK_AT && <span className="sf-stock">Only {remaining} left</span>}
              {reviews.length > 0 && (
                <span className="sf-muted inline-flex items-center gap-1.5 text-sm">
                  <Stars value={avg} size={14} />
                  {avg.toFixed(1)} · {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
                </span>
              )}
            </div>
            <h1 className="sf-heading text-[1.9rem] sm:text-[2.35rem]">{product.title}</h1>
            {product.subtitle && <p className="sf-muted text-[1.05rem] leading-relaxed">{product.subtitle}</p>}
          </header>

          {product.description && (
            <div className="sf-prose mt-7">
              <Markdown>{product.description}</Markdown>
            </div>
          )}

          {!isLink && files.length > 0 && (
            <p className="sf-muted mt-6 text-sm">
              Includes {files.length} {files.length === 1 ? "file" : "files"}
              {links.length > 0 ? ` and ${links.length} ${links.length === 1 ? "link" : "links"}` : ""}. Delivered instantly by email.
            </p>
          )}
        </article>

        <section className="sf-surface sf-rise mt-8 p-5 sm:p-7" style={{ animationDelay: "120ms" }} id="checkout">
          {isLink ? (
            <div className="space-y-3">
              {links.map((l) => (
                <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className="sf-btn w-full text-base">
                  {l.label}
                  <ArrowUpRight size={18} />
                </a>
              ))}
            </div>
          ) : soldOut ? (
            <div className="text-center">
              <h2 className="sf-heading text-[1.2rem]">Sold out</h2>
              <p className="sf-muted mt-2 text-[0.95rem]">
                All {product.quantityLimit} {product.quantityLimit === 1 ? "copy" : "copies"} of {product.title} are gone. Follow {store.displayName} for the next drop.
              </p>
            </div>
          ) : (
            <>
              <h2 className="sf-heading mb-4 text-[1.2rem]">{product.priceCents === 0 ? "Where should we send it?" : "Get instant access"}</h2>
              <CheckoutForm
                username={store.username}
                slug={product.slug}
                storeId={store.id}
                storeName={store.displayName}
                productId={product.id}
                priceCents={product.priceCents}
                currency={product.currency}
                buttonText={product.buttonText}
                fields={product.fields}
                marketingOptIn={product.marketingOptIn}
                bump={bumpOffer}
              />
            </>
          )}
        </section>

        {reviews.length > 0 && (
          <section className="sf-rise mt-12" style={{ animationDelay: "180ms" }}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="sf-heading text-[1.2rem]">What people say</h2>
              <span className="sf-muted inline-flex items-center gap-2 text-sm">
                <Stars value={avg} size={14} /> {avg.toFixed(1)}
              </span>
            </div>
            <ul className="space-y-3">
              {reviews.map((r) => (
                <li key={r.id} className="sf-surface p-5">
                  <Stars value={r.rating} size={14} />
                  {r.quote && <p className="mt-2 text-[0.98rem] leading-relaxed">&ldquo;{r.quote}&rdquo;</p>}
                  <p className="sf-muted mt-2 text-sm">{r.reviewerName ?? "Verified buyer"}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {siblings.length > 0 && !landing && (
          <section className="sf-rise mt-12" style={{ animationDelay: "220ms" }}>
            <h2 className="sf-heading mb-4 text-[1.2rem]">More from {store.displayName}</h2>
            <div className="flex flex-col gap-4">
              {siblings.map((p) => (
                <ProductCard key={p.id} product={toCard(p)} mode="list" />
              ))}
            </div>
          </section>
        )}

        <StoreFooter show={theme.showBranding} />
      </main>
    </ThemeRoot>
  );
}
