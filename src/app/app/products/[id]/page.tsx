import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, gt, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { discountCodes, productFiles, productLinks, products, sections } from "@/db/schema";
import { ProductEditor } from "@/components/app/product-editor/editor";
import { requireStore } from "@/lib/auth";
import { env } from "@/lib/env";
import { publicUrl } from "@/lib/storage";

export const metadata: Metadata = { title: "Edit product" };

export default async function ProductEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { store } = await requireStore();
  const product = await db.query.products.findFirst({ where: and(eq(products.id, id), eq(products.storeId, store.id), isNull(products.deletedAt)) });
  if (!product) notFound();
  const [files, links, secs, codes, bumpCandidates] = await Promise.all([
    db.select().from(productFiles).where(eq(productFiles.productId, product.id)).orderBy(asc(productFiles.position)),
    db.select().from(productLinks).where(eq(productLinks.productId, product.id)).orderBy(asc(productLinks.position)),
    db.select({ id: sections.id, title: sections.title }).from(sections).where(eq(sections.storeId, store.id)).orderBy(asc(sections.position)),
    db.select().from(discountCodes).where(eq(discountCodes.productId, product.id)).orderBy(desc(discountCodes.createdAt)),
    // Paid, published, live downloads from this store can be offered as an order bump.
    db
      .select({ id: products.id, title: products.title, priceCents: products.priceCents })
      .from(products)
      .where(
        and(eq(products.storeId, store.id), ne(products.id, product.id), eq(products.status, "published"), eq(products.type, "download"), gt(products.priceCents, 0), isNull(products.deletedAt)),
      )
      .orderBy(asc(products.position)),
  ]);

  return (
    <ProductEditor
      product={{
        id: product.id,
        title: product.title === "Untitled product" ? "" : product.title,
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
        quantityLimit: product.quantityLimit,
        bumpProductId: product.bumpProductId,
        bumpHeadline: product.bumpHeadline ?? "",
        bumpDiscountPercent: product.bumpDiscountPercent,
        status: product.status,
      }}
      quantitySold={product.quantitySold}
      bumpCandidates={bumpCandidates}
      discountCodes={codes.map((c) => ({
        id: c.id,
        code: c.code,
        percentOff: c.percentOff,
        amountOffCents: c.amountOffCents,
        maxUses: c.maxUses,
        uses: c.uses,
        expiresAt: c.expiresAt,
        active: c.active,
        createdAt: c.createdAt,
      }))}
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
