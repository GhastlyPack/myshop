import Link from "next/link";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders, products, stores } from "@/db/schema";
import { publicUrl } from "@/lib/storage";
import { SITE } from "@/lib/site";

/**
 * Proof from live data, never invented. Shows the newest public stores by avatar and, once the
 * numbers are worth saying, the counts. A featured quote appears only when one is set in SITE.
 */
export async function ProofStrip() {
  const [recent, [totals]] = await Promise.all([
    db
      .select({ username: stores.username, displayName: stores.displayName, avatarKey: stores.avatarKey })
      .from(stores)
      .innerJoin(products, and(eq(products.storeId, stores.id), eq(products.status, "published"), isNull(products.deletedAt)))
      .where(eq(stores.published, true))
      .groupBy(stores.id)
      .orderBy(sql`max(${stores.createdAt}) desc`)
      .limit(6),
    db
      .select({ stores: sql<number>`count(distinct ${stores.id})`, orders: sql<number>`(select count(*) from ${orders} where ${orders.status} = 'paid')` })
      .from(stores)
      .where(eq(stores.published, true)),
  ]);
  const storeCount = Number(totals?.stores ?? 0);
  const orderCount = Number(totals?.orders ?? 0);
  const bigEnough = storeCount >= 25;
  const quote = SITE.testimonial;

  return (
    <section className="border-y ld-line bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between">
        <Link href="/creators" className="flex items-center gap-4">
          <span className="flex -space-x-2.5">
            {recent.map((s) => {
              const src = publicUrl(s.avatarKey);
              return src ? (
                // eslint-disable-next-line @next/next/no-img-element -- creator upload
                <img key={s.username} src={src} alt={s.displayName} width={40} height={40} loading="lazy" className="h-10 w-10 rounded-full border-2 border-white object-cover" />
              ) : (
                <span key={s.username} className="grid h-10 w-10 place-content-center rounded-full border-2 border-white bg-[var(--ld-ink)] text-sm font-semibold text-white" aria-hidden>
                  {s.displayName.trim().charAt(0).toUpperCase()}
                </span>
              );
            })}
          </span>
          <span className="text-sm">
            {bigEnough ? (
              <>
                <span className="font-semibold">{storeCount.toLocaleString()} creators</span> <span className="ld-muted">selling from their bio{orderCount >= 100 ? `, ${orderCount.toLocaleString()} orders delivered` : ""}</span>
              </>
            ) : (
              <>
                <span className="font-semibold">Newest stores</span> <span className="ld-muted">on visitmy.shop. See them all.</span>
              </>
            )}
          </span>
        </Link>
        {quote && (
          <blockquote className="max-w-md text-sm leading-relaxed">
            “{quote.text}”<footer className="ld-muted mt-1 not-italic">{quote.name}, visitmy.shop/{quote.username}</footer>
          </blockquote>
        )}
      </div>
    </section>
  );
}
