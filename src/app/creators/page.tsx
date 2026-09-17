import type { Metadata } from "next";
import Link from "next/link";
import { and, count, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { products, stores } from "@/db/schema";
import { MarketingShell } from "@/components/landing/shell";
import { publicUrl } from "@/lib/storage";

export const revalidate = 600;
export const metadata: Metadata = {
  title: "Creators on visitmy.shop",
  description: "Stores built on visitmy.shop: coaches, photographers, designers, and writers selling digital products from their bio.",
  alternates: { canonical: "/creators" },
};

/** Every published store with at least one listed product, most products first. */
async function loadStores() {
  return db
    .select({ username: stores.username, displayName: stores.displayName, bio: stores.bio, avatarKey: stores.avatarKey, productCount: count(products.id) })
    .from(stores)
    .innerJoin(products, and(eq(products.storeId, stores.id), eq(products.status, "published"), eq(products.listed, true), isNull(products.deletedAt)))
    .where(eq(stores.published, true))
    .groupBy(stores.id)
    .orderBy(sql`count(${products.id}) desc`, stores.createdAt)
    .limit(120);
}

export default async function CreatorsPage() {
  const rows = await loadStores();
  return (
    <MarketingShell>
      <main className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
        <h1 className="ld-heading text-[2.6rem] sm:text-[3.4rem]">Stores on visitmy.shop.</h1>
        <p className="ld-muted mt-6 max-w-2xl text-xl leading-relaxed">Real creators selling real files from one link. Open any store to see what a checkout feels like.</p>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((s) => {
            const avatar = publicUrl(s.avatarKey);
            return (
              <li key={s.username}>
                <Link href={`/${s.username}`} className="ld-card flex h-full items-start gap-4 p-5 transition-colors hover:bg-[var(--ld-tint)]">
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element -- creator upload
                    <img src={avatar} alt={s.displayName} width={56} height={56} loading="lazy" className="h-14 w-14 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className="grid h-14 w-14 shrink-0 place-content-center rounded-full bg-[var(--ld-orange)] text-lg font-semibold text-white" aria-hidden>
                      {s.displayName.trim().charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block font-semibold">{s.displayName}</span>
                    <span className="ld-muted block text-sm">
                      visitmy.shop/{s.username} · {s.productCount} {s.productCount === 1 ? "product" : "products"}
                    </span>
                    {s.bio && <span className="ld-muted mt-2 line-clamp-2 block text-sm leading-relaxed">{s.bio}</span>}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        {rows.length === 0 && <p className="ld-muted mt-8">No public stores yet.</p>}
        <p className="ld-muted mt-12 text-sm">
          Want yours here? <Link href="/" className="underline underline-offset-4">Claim your link</Link> and publish a product.
        </p>
      </main>
    </MarketingShell>
  );
}
