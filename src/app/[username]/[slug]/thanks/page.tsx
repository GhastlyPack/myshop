import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, inArray } from "drizzle-orm";
import { ArrowUpRight, Download, Inbox } from "lucide-react";
import { db } from "@/db";
import { bookings, entitlements, orders, productFiles, productLinks, products, reviews, stores } from "@/db/schema";
import { StoreFooter } from "@/components/storefront/footer";
import { PendingPoll } from "@/components/storefront/pending-poll";
import { StorePixelEvent } from "@/components/storefront/store-pixels";
import { resolveStorePixels } from "@/lib/pixels";
import { env } from "@/lib/env";
import { GaEvent } from "@/components/analytics/ga-event";
import { ReviewForm } from "@/components/storefront/review-form";
import { CompactStoreHeader } from "@/components/storefront/store-header";
import { ThemeRoot } from "@/components/storefront/theme-root";
import { resolveTheme } from "@/lib/theme";
import { formatBookingWhen } from "@/lib/timezone";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your order", robots: { index: false } };

type Props = { params: Promise<{ username: string; slug: string }>; searchParams: Promise<{ e?: string; o?: string }> };

function fmtBytes(n: number) {
  if (n <= 0) return "";
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Post-checkout page. `?e=<entitlement token>` (free flow, or paid once the webhook ran)
 * or `?o=<order id>` (paid flow success URL before the entitlement exists).
 * Lists every entitlement on the order: the product bought plus the order bump, if any.
 */
export default async function ThanksPage({ params, searchParams }: Props) {
  const [{ username, slug }, sp] = await Promise.all([params, searchParams]);
  const token = sp.e?.slice(0, 80);
  const orderId = sp.o?.slice(0, 64);
  if (!token && !orderId) notFound();

  const byToken = token ? await db.query.entitlements.findFirst({ where: and(eq(entitlements.token, token), eq(entitlements.revoked, false)) }) : undefined;
  const order = byToken ? await db.query.orders.findFirst({ where: eq(orders.id, byToken.orderId) }) : orderId ? await db.query.orders.findFirst({ where: eq(orders.id, orderId) }) : undefined;
  if (!order) notFound();
  const ents = order.status === "paid" ? await db.select().from(entitlements).where(and(eq(entitlements.orderId, order.id), eq(entitlements.revoked, false))).orderBy(asc(entitlements.createdAt)) : [];
  // Main product first, then the bump.
  ents.sort((a, b) => (a.productId === order.productId ? -1 : b.productId === order.productId ? 1 : 0));
  const ent = ents.find((e) => e.productId === order.productId) ?? ents[0];

  const [store, product] = await Promise.all([
    db.query.stores.findFirst({ where: eq(stores.id, order.storeId) }),
    db.query.products.findFirst({ where: eq(products.id, order.productId) }),
  ]);
  if (!store || !product || store.username !== username.toLowerCase() || product.slug !== slug.toLowerCase()) notFound();
  const theme = resolveTheme(store.theme);

  // Booking order: a call, not a download (though it may carry pre-call materials).
  if (product.type === "booking") {
    const booking = await db.query.bookings.findFirst({ where: eq(bookings.orderId, order.id) });
    const pending = order.status === "pending" || !booking;
    const bEnt = booking ? await db.query.entitlements.findFirst({ where: and(eq(entitlements.orderId, order.id), eq(entitlements.revoked, false)) }) : undefined;
    const [bFiles, bLinks] = booking
      ? await Promise.all([
          db.select().from(productFiles).where(eq(productFiles.productId, product.id)).orderBy(asc(productFiles.position)),
          db.select().from(productLinks).where(eq(productLinks.productId, product.id)).orderBy(asc(productLinks.position)),
        ])
      : [[], []];
    const hasMaterials = (bEnt && bFiles.length > 0) || bLinks.length > 0;
    return (
      <ThemeRoot theme={theme}>
        <main className="mx-auto w-full max-w-[600px] px-4 pt-6 pb-6 sm:px-6 sm:pt-8">
          <CompactStoreHeader store={store} theme={theme} />
          {booking && order.amountCents > 0 && (
            <StorePixelEvent
              pixels={resolveStorePixels(store.pixels, env.META_PIXEL_ID)}
              event="Purchase"
              eventId={order.id}
              data={{ contentIds: [product.id], contentName: product.title, currency: order.currency, value: order.amountCents / 100 }}
            />
          )}
          <div className="mt-8 space-y-6">
            <section className="sf-surface p-6 text-center sm:p-7">
              {pending ? (
                <>
                  <h1 className="sf-heading text-[1.4rem]">Confirming your booking…</h1>
                  <p className="sf-muted mt-2 text-[0.95rem]">This takes a moment. We&apos;ll email your calendar invite as soon as it&apos;s confirmed.</p>
                  <PendingPoll email={order.buyerEmail} />
                </>
              ) : (
                <>
                  <h1 className="sf-heading text-[1.4rem]">You&apos;re booked</h1>
                  <p className="sf-muted mt-2 text-[0.95rem]">
                    {product.title} with {store.displayName}
                  </p>
                  <p className="mt-4 text-[1.05rem] font-semibold">{formatBookingWhen(booking!.startAt, booking!.endAt, booking!.timezone)}</p>
                  {booking!.meetingUrl && (
                    <a href={booking!.meetingUrl} target="_blank" rel="noreferrer" className="sf-btn mt-5 inline-flex">
                      Join the call
                    </a>
                  )}
                  <p className="sf-muted mt-5 text-sm">A calendar invite is on its way to {order.buyerEmail}.</p>
                </>
              )}
            </section>
            {!pending && hasMaterials && (
              <section className="sf-surface p-6 sm:p-7">
                <h2 className="sf-heading text-[1.1rem]">Before your call</h2>
                <ul className="mt-4 space-y-2">
                  {bEnt &&
                    bFiles.map((f) => (
                      <li key={f.id}>
                        <a href={`/d/${bEnt.token}?f=${encodeURIComponent(f.id)}`} className="sf-btn sf-btn-ghost w-full justify-between">
                          <span className="truncate">{f.filename}</span>
                          <Download size={18} />
                        </a>
                      </li>
                    ))}
                  {bLinks.map((l) => (
                    <li key={l.id}>
                      <a href={l.url} target="_blank" rel="noreferrer" className="sf-btn sf-btn-ghost w-full justify-between">
                        <span className="truncate">{l.label}</span>
                        <ArrowUpRight size={18} />
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </main>
      </ThemeRoot>
    );
  }

  const paid = order.status === "paid" && ent;
  const productIds = ents.map((e) => e.productId);
  const [allProducts, files, links, existing] = paid
    ? await Promise.all([
        db.select().from(products).where(inArray(products.id, productIds)),
        db.select().from(productFiles).where(inArray(productFiles.productId, productIds)).orderBy(asc(productFiles.position)),
        db.select().from(productLinks).where(inArray(productLinks.productId, productIds)).orderBy(asc(productLinks.position)),
        db.query.reviews.findFirst({ where: eq(reviews.orderId, order.id) }),
      ])
    : [[], [], [], undefined];
  const items = ents
    .map((e) => ({
      ent: e,
      product: allProducts.find((p) => p.id === e.productId),
      files: files.filter((f) => f.productId === e.productId),
      links: links.filter((l) => l.productId === e.productId),
    }))
    .filter((it): it is typeof it & { product: NonNullable<typeof it.product> } => Boolean(it.product));
  const hasContent = items.some((it) => it.files.length > 0 || it.links.length > 0);

  return (
    <ThemeRoot theme={theme}>
      <main className="mx-auto w-full max-w-[600px] px-4 pt-6 pb-6 sm:px-6 sm:pt-8">
        <CompactStoreHeader store={store} theme={theme} />
        <div className="mt-8 space-y-6">
          {order.status === "pending" && <PendingPoll email={order.buyerEmail} />}
          {paid && (
            <GaEvent
              name={order.amountCents === 0 ? "generate_lead" : "purchase"}
              persist={`order:${order.id}`}
              params={{
                transaction_id: order.id,
                store: store.username,
                currency: order.currency.toUpperCase(),
                value: order.amountCents / 100,
                items: items.map((it) => ({ item_id: it.product.id, item_name: it.product.title, price: it.product.priceCents / 100, quantity: 1 })),
              }}
            />
          )}
          {paid && (
            <StorePixelEvent
              pixels={resolveStorePixels(store.pixels, env.META_PIXEL_ID)}
              event={order.amountCents === 0 ? "Lead" : "Purchase"}
              eventId={order.id}
              data={{ contentIds: productIds, contentName: product.title, currency: order.currency, value: order.amountCents / 100 }}
            />
          )}
          {(order.status === "failed" || order.status === "refunded") && (
            <div className="sf-surface p-6 text-center">
              <h1 className="sf-heading text-[1.4rem]">{order.status === "refunded" ? "This order was refunded" : "Payment didn't go through"}</h1>
              <p className="sf-muted mt-2 text-sm">
                {order.status === "refunded" ? "Downloads for refunded orders are switched off." : "Nothing was charged. You can try again from the product page."}
              </p>
              <Link href={`/${store.username}/${product.slug}`} className="sf-btn sf-btn-ghost mt-5">
                Back to {product.title}
              </Link>
            </div>
          )}

          {paid && ent && (
            <>
              <section className="sf-rise">
                <p className="sf-chip mb-3">{order.amountCents === 0 ? "It's yours" : "Payment confirmed"}</p>
                <h1 className="sf-heading text-[1.9rem] sm:text-[2.2rem]">{product.title}</h1>
                {items.length > 1 && <p className="sf-muted mt-1 text-[0.95rem]">Plus {items.slice(1).map((it) => it.product.title).join(", ")}</p>}
                <p className="sf-muted mt-2 flex items-start gap-2 text-[0.95rem]">
                  <Inbox size={18} className="mt-0.5 shrink-0" />
                  <span>
                    We also emailed everything below to <strong style={{ color: "var(--sf-text)" }}>{order.buyerEmail}</strong>. Check spam if it&apos;s shy.
                  </span>
                </p>
              </section>

              {hasContent &&
                items.map((it, i) => (
                  <section key={it.ent.id} className="sf-rise space-y-3" style={{ animationDelay: `${80 + i * 40}ms` }}>
                    {items.length > 1 && <h2 className="sf-heading text-[1.05rem]">{it.product.title}</h2>}
                    {it.files.map((f) => (
                      <a key={f.id} href={`/d/${it.ent.token}?f=${encodeURIComponent(f.id)}`} className="sf-card flex items-center gap-4 p-4 sm:p-5">
                        <span className="sf-btn shrink-0" style={{ padding: "0.8rem" }} aria-hidden>
                          <Download size={20} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{f.filename}</span>
                          <span className="sf-muted block text-sm">
                            Download{f.bytes ? ` · ${fmtBytes(f.bytes)}` : ""}
                          </span>
                        </span>
                      </a>
                    ))}
                    {it.links.map((l) => (
                      <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className="sf-card flex items-center gap-4 p-4 sm:p-5">
                        <span className="sf-btn sf-btn-ghost shrink-0" style={{ padding: "0.8rem" }} aria-hidden>
                          <ArrowUpRight size={20} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{l.label}</span>
                          <span className="sf-muted block truncate text-sm">{l.url.replace(/^https?:\/\//, "")}</span>
                        </span>
                      </a>
                    ))}
                  </section>
                ))}

              <p className="sf-muted text-center text-sm">
                <Link href="/me" className="sf-link">
                  See all your downloads
                </Link>{" "}
                from every creator, any time.
              </p>

              <section className="sf-surface sf-rise p-5 sm:p-7" style={{ animationDelay: "160ms" }}>
                {existing ? (
                  <p className="text-[0.95rem]">Thanks for your review! It shows up once {store.displayName} approves it.</p>
                ) : (
                  <ReviewForm token={ent.token} productTitle={product.title} defaultName={order.buyerName.split(" ")[0] ?? ""} />
                )}
              </section>
            </>
          )}
        </div>
        <StoreFooter show={theme.showBranding} />
      </main>
    </ThemeRoot>
  );
}
