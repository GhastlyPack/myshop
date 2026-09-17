import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { NewProductButton } from "@/components/app/new-product-button";
import { ProductsBoard, type BoardProduct, type BoardSection } from "@/components/app/products-board";
import { requireStore } from "@/lib/auth";
import { env } from "@/lib/env";
import { getStoreEditorData } from "@/lib/queries";
import { publicUrl } from "@/lib/storage";

export const metadata: Metadata = { title: "My store" };

export default async function AppHome() {
  const { store } = await requireStore();
  const data = await getStoreEditorData(store.id);

  const sections: BoardSection[] = data.sections.map((s) => ({ id: s.id, title: s.title }));
  const products: BoardProduct[] = data.products.map((p) => ({
    id: p.id,
    sectionId: p.sectionId,
    title: p.title,
    slug: p.slug,
    priceCents: p.priceCents,
    currency: p.currency,
    status: p.status,
    listed: p.listed,
    type: p.type,
    thumbnailUrl: publicUrl(p.thumbnailKey),
  }));
  const boardKey = [
    ...data.sections.map((s) => `${s.id}:${s.title}:${s.position}`),
    ...data.products.map((p) => `${p.id}:${p.sectionId}:${p.position}:${p.title}:${p.status}:${p.listed}`),
  ].join("|");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{store.displayName}</h1>
          <a
            href={`/${store.username}`}
            target="_blank"
            rel="noreferrer"
            className="mt-0.5 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            visitmy.shop/{store.username} <ExternalLink className="size-3.5" />
          </a>
          {!store.published && <p className="mt-1 text-xs text-amber-700">Your store is unpublished. Visitors see nothing until you publish it in Settings.</p>}
        </div>
        <NewProductButton />
      </div>
      <ProductsBoard key={boardKey} sections={sections} products={products} username={store.username} baseUrl={env.APP_BASE_URL} />
    </div>
  );
}
