import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Product, ProductLink, Section } from "@/db/schema";
import { db } from "@/db";
import { StoreFooter } from "@/components/storefront/footer";
import { resolveStoreTheme } from "@/components/storefront/preview-theme";
import { ProductCard, type CardProduct } from "@/components/storefront/product-card";
import { StoreHeader } from "@/components/storefront/store-header";
import { ThemeRoot } from "@/components/storefront/theme-root";
import { TrackView } from "@/components/storefront/track-view";
import { getPublicStoreTagged, storeTag } from "@/lib/queries";
import { publicUrl } from "@/lib/storage";
import { inArray } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { productLinks } from "@/db/schema";

type Props = { params: Promise<{ username: string }>; searchParams: Promise<{ previewTheme?: string | string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const data = await getPublicStoreTagged(username);
  if (!data) return { title: "Not found" };
  const { store } = data;
  return {
    title: { absolute: `${store.displayName} (@${store.username})` },
    description: store.bio ?? `${store.displayName} on visitmy.shop`,
    openGraph: { title: `${store.displayName} (@${store.username})`, description: store.bio ?? undefined, type: "profile" },
    twitter: { card: "summary_large_image", title: `${store.displayName} (@${store.username})`, description: store.bio ?? undefined },
  };
}

/** First link of each `link`-type product so the card can go straight to it. Cached under the store tag. */
async function firstLinks(username: string, products: Product[]) {
  const ids = products.filter((p) => p.type === "link").map((p) => p.id);
  if (ids.length === 0) return new Map<string, ProductLink>();
  const fn = unstable_cache(
    async () => db.select().from(productLinks).where(inArray(productLinks.productId, ids)).orderBy(productLinks.position),
    ["store-first-links", username.toLowerCase(), ids.join(",")],
    { tags: [storeTag(username)], revalidate: 300 },
  );
  const m = new Map<string, ProductLink>();
  for (const r of await fn()) if (!m.has(r.productId)) m.set(r.productId, r);
  return m;
}

export default async function StorefrontPage({ params, searchParams }: Props) {
  const [{ username }, sp] = await Promise.all([params, searchParams]);
  const data = await getPublicStoreTagged(username);
  if (!data) notFound();
  const { store, sections, products } = data;
  const { theme, isPreview } = await resolveStoreTheme(store, sp.previewTheme);
  const links = await firstLinks(store.username, products);

  const toCard = (p: Product): CardProduct => {
    const ext = p.type === "link" ? links.get(p.id) : undefined;
    return {
      id: p.id,
      storeId: store.id,
      title: p.title,
      subtitle: p.subtitle,
      priceCents: p.priceCents,
      currency: p.currency,
      buttonText: p.buttonText,
      cardStyle: p.cardStyle,
      thumbUrl: publicUrl(p.thumbnailKey),
      bannerUrl: publicUrl(p.bannerKey),
      href: ext ? ext.url : `/${store.username}/${p.slug}`,
      external: Boolean(ext),
      remaining: p.quantityLimit == null ? null : Math.max(0, p.quantityLimit - p.quantitySold),
    };
  };

  // Sections in order, then anything unsectioned. Hero layout pulls the first product out on top.
  const bySection = new Map<string | null, Product[]>();
  for (const p of products) {
    const key = p.sectionId && sections.some((s) => s.id === p.sectionId) ? p.sectionId : null;
    bySection.set(key, [...(bySection.get(key) ?? []), p]);
  }
  const groups: { section: Section | null; products: Product[] }[] = [
    ...sections.map((s) => ({ section: s, products: bySection.get(s.id) ?? [] })).filter((g) => g.products.length > 0),
    ...(bySection.get(null)?.length ? [{ section: null, products: bySection.get(null)! }] : []),
  ];
  let hero: Product | null = null;
  if (theme.layout === "hero" && groups.length > 0) {
    hero = groups[0].products[0];
    groups[0].products = groups[0].products.slice(1);
    if (groups[0].products.length === 0) groups.shift();
  }
  const mode = theme.layout === "grid" ? "grid" : "list";

  return (
    <ThemeRoot theme={theme}>
      {!isPreview && <TrackView storeId={store.id} type="view" />}
      <main className="mx-auto w-full max-w-[600px] px-4 pt-12 pb-6 sm:px-6 sm:pt-16">
        <StoreHeader store={store} theme={theme} />

        <div className="mt-10 space-y-10 sm:mt-12">
          {hero && <ProductCard product={toCard(hero)} mode="hero" />}
          {groups.map((g, gi) => (
            <section key={g.section?.id ?? "none"} className="sf-rise" style={{ animationDelay: `${80 + gi * 60}ms` }}>
              {g.section && <h2 className="sf-heading sf-muted mb-4 text-center text-[0.8rem] font-semibold tracking-[0.18em] uppercase">{g.section.title}</h2>}
              <div className={mode === "grid" ? "grid grid-cols-2 gap-3 sm:gap-4" : "flex flex-col gap-4"}>
                {g.products.map((p) => (
                  <ProductCard key={p.id} product={toCard(p)} mode={mode} />
                ))}
              </div>
            </section>
          ))}
          {products.length === 0 && <p className="sf-muted text-center text-sm">Nothing here yet. Check back soon.</p>}
        </div>

        <StoreFooter show={theme.showBranding} />
      </main>
    </ThemeRoot>
  );
}
