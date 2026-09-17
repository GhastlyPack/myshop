import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { productFiles, productLinks, products, sections } from "@/db/schema";
import { ProductEditor } from "@/components/app/product-editor/editor";
import { requireStore } from "@/lib/auth";
import { env } from "@/lib/env";
import { publicUrl } from "@/lib/storage";

export const metadata: Metadata = { title: "Edit product" };

export default async function ProductEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { store } = await requireStore();
  const product = await db.query.products.findFirst({ where: and(eq(products.id, id), eq(products.storeId, store.id)) });
  if (!product) notFound();
  const [files, links, secs] = await Promise.all([
    db.select().from(productFiles).where(eq(productFiles.productId, product.id)).orderBy(asc(productFiles.position)),
    db.select().from(productLinks).where(eq(productLinks.productId, product.id)).orderBy(asc(productLinks.position)),
    db.select({ id: sections.id, title: sections.title }).from(sections).where(eq(sections.storeId, store.id)).orderBy(asc(sections.position)),
  ]);

  return (
    <ProductEditor
      product={{
        id: product.id,
        title: product.title,
        subtitle: product.subtitle ?? "",
        slug: product.slug,
        description: product.description ?? "",
        type: product.type,
        priceCents: product.priceCents,
        cardStyle: product.cardStyle,
        buttonText: product.buttonText,
        thumbnailKey: product.thumbnailKey,
        bannerKey: product.bannerKey,
        sectionId: product.sectionId,
        fields: product.fields,
        marketingOptIn: product.marketingOptIn,
        confirmationSubject: product.confirmationSubject ?? "",
        confirmationBody: product.confirmationBody ?? "",
        listed: product.listed,
        dmKeyword: product.dmKeyword ?? "",
        status: product.status,
      }}
      thumbnailUrl={publicUrl(product.thumbnailKey)}
      bannerUrl={publicUrl(product.bannerKey)}
      files={files.map((f) => ({ id: f.id, filename: f.filename, bytes: f.bytes, mime: f.mime }))}
      links={links.map((l) => ({ url: l.url, label: l.label }))}
      sections={secs}
      store={{ username: store.username, currency: store.currency }}
      baseUrl={env.APP_BASE_URL}
    />
  );
}
