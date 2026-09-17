import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import { ArrowUpRight } from "lucide-react";
import { CheckoutForm } from "@/components/storefront/checkout-form";
import { StoreFooter } from "@/components/storefront/footer";
import { resolveStoreTheme } from "@/components/storefront/preview-theme";
import { formatPrice } from "@/components/storefront/price";
import { Stars } from "@/components/storefront/stars";
import { CompactStoreHeader } from "@/components/storefront/store-header";
import { ThemeRoot } from "@/components/storefront/theme-root";
import { TrackView } from "@/components/storefront/track-view";
import { PixelEvent } from "@/components/storefront/pixel-event";
import { getPublicProduct } from "@/lib/queries";
import { publicUrl } from "@/lib/storage";

type Props = { params: Promise<{ username: string; slug: string }>; searchParams: Promise<{ lp?: string; previewTheme?: string | string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username, slug } = await params;
  const data = await getPublicProduct(username, slug);
  if (!data) return { title: "Not found" };
  const { store, product } = data;
  const img = publicUrl(product.bannerKey) ?? publicUrl(product.thumbnailKey) ?? publicUrl(store.avatarKey);
  const title = `${product.title} · ${store.displayName}`;
  const description = product.subtitle ?? product.description?.slice(0, 160) ?? undefined;
  return {
    title: { absolute: title },
    description,
    openGraph: { title, description, images: img ? [img] : undefined },
    twitter: { card: img ? "summary_large_image" : "summary", title, description, images: img ? [img] : undefined },
  };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const [{ username, slug }, sp] = await Promise.all([params, searchParams]);
  const data = await getPublicProduct(username, slug);
  if (!data) notFound();
  const { store, product, files, links, reviews } = data;
  const { theme, isPreview } = await resolveStoreTheme(store, sp.previewTheme);
  const landing = sp.lp === "1";
  const banner = publicUrl(product.bannerKey);
  const thumb = publicUrl(product.thumbnailKey);
  const avg = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0;
  const isLink = product.type === "link";

  return (
    <ThemeRoot theme={theme}>
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
              <img src={banner} alt="" />
            </div>
          ) : thumb ? (
            <div className="sf-thumb aspect-square w-32 sm:w-40" style={{ borderRadius: "var(--sf-card-radius)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- creator upload */}
              <img src={thumb} alt="" />
            </div>
          ) : null}

          <header className="mt-6 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="sf-chip">{isLink ? "Link" : formatPrice(product.priceCents, product.currency)}</span>
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

        <StoreFooter show={theme.showBranding} />
      </main>
    </ThemeRoot>
  );
}
