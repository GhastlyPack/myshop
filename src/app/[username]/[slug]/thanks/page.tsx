import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { ArrowUpRight, Download, Inbox } from "lucide-react";
import { db } from "@/db";
import { entitlements, orders, productFiles, productLinks, products, reviews, stores } from "@/db/schema";
import { StoreFooter } from "@/components/storefront/footer";
import { PendingPoll } from "@/components/storefront/pending-poll";
import { ReviewForm } from "@/components/storefront/review-form";
import { CompactStoreHeader } from "@/components/storefront/store-header";
import { ThemeRoot } from "@/components/storefront/theme-root";
import { resolveTheme } from "@/lib/theme";

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
 */
export default async function ThanksPage({ params, searchParams }: Props) {
  const [{ username, slug }, sp] = await Promise.all([params, searchParams]);
  const token = sp.e?.slice(0, 80);
  const orderId = sp.o?.slice(0, 64);
  if (!token && !orderId) notFound();

  let ent = token ? await db.query.entitlements.findFirst({ where: and(eq(entitlements.token, token), eq(entitlements.revoked, false)) }) : undefined;
  const order = ent ? await db.query.orders.findFirst({ where: eq(orders.id, ent.orderId) }) : orderId ? await db.query.orders.findFirst({ where: eq(orders.id, orderId) }) : undefined;
  if (!order) notFound();
  if (!ent && order.status === "paid") ent = await db.query.entitlements.findFirst({ where: and(eq(entitlements.orderId, order.id), eq(entitlements.revoked, false)) });

  const [store, product] = await Promise.all([
    db.query.stores.findFirst({ where: eq(stores.id, order.storeId) }),
    db.query.products.findFirst({ where: eq(products.id, order.productId) }),
  ]);
  if (!store || !product || store.username !== username.toLowerCase() || product.slug !== slug.toLowerCase()) notFound();
  const theme = resolveTheme(store.theme);

  const paid = order.status === "paid" && ent;
  const [files, links, existing] = paid
    ? await Promise.all([
        db.select().from(productFiles).where(eq(productFiles.productId, product.id)).orderBy(asc(productFiles.position)),
        db.select().from(productLinks).where(eq(productLinks.productId, product.id)).orderBy(asc(productLinks.position)),
        db.query.reviews.findFirst({ where: eq(reviews.orderId, order.id) }),
      ])
    : [[], [], undefined];

  return (
    <ThemeRoot theme={theme}>
      <main className="mx-auto w-full max-w-[600px] px-4 pt-6 pb-6 sm:px-6 sm:pt-8">
        <CompactStoreHeader store={store} theme={theme} />
        <div className="mt-8 space-y-6">
          {order.status === "pending" && <PendingPoll email={order.buyerEmail} />}
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
                <p className="sf-muted mt-2 flex items-start gap-2 text-[0.95rem]">
                  <Inbox size={18} className="mt-0.5 shrink-0" />
                  <span>
                    We also emailed everything below to <strong style={{ color: "var(--sf-text)" }}>{order.buyerEmail}</strong>. Check spam if it&apos;s shy.
                  </span>
                </p>
              </section>

              {(files.length > 0 || links.length > 0) && (
                <section className="sf-rise space-y-3" style={{ animationDelay: "80ms" }}>
                  {files.map((f) => (
                    <a key={f.id} href={`/d/${ent.token}?f=${encodeURIComponent(f.id)}`} className="sf-card flex items-center gap-4 p-4 sm:p-5">
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
                  {links.map((l) => (
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
              )}

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
