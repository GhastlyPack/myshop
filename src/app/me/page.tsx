import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { ArrowUpRight, Download, LogOut, Star } from "lucide-react";
import { db } from "@/db";
import { entitlements, orders, productFiles, productLinks, products, reviews, stores } from "@/db/schema";
import { getBuyerEmail } from "@/lib/buyer-session";
import { publicUrl } from "@/lib/storage";
import { signOutAction } from "./actions";
import { MagicForm } from "./magic-form";
import { GaEvent } from "@/components/analytics/ga-event";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My downloads", robots: { index: false } };

// Root layout loads Inter as --font-inter but never maps it to --font-sans; pin it here.
const FONT = { fontFamily: "var(--font-inter), system-ui, sans-serif" } as const;

/** Buyer portal: every entitlement for this email across every store, grouped by store. */
async function loadLibrary(email: string) {
  const rows = await db
    .select({ ent: entitlements, order: orders, product: products, store: stores })
    .from(entitlements)
    .innerJoin(orders, eq(orders.id, entitlements.orderId))
    .innerJoin(products, eq(products.id, entitlements.productId))
    .innerJoin(stores, eq(stores.id, orders.storeId))
    .where(and(eq(entitlements.buyerEmail, email), eq(entitlements.revoked, false), eq(orders.status, "paid")))
    .orderBy(desc(entitlements.createdAt));
  if (rows.length === 0) return [];
  const productIds = [...new Set(rows.map((r) => r.product.id))];
  const orderIds = rows.map((r) => r.order.id);
  const [files, links, reviewed] = await Promise.all([
    db.select().from(productFiles).where(inArray(productFiles.productId, productIds)).orderBy(asc(productFiles.position)),
    db.select().from(productLinks).where(inArray(productLinks.productId, productIds)).orderBy(asc(productLinks.position)),
    db.select({ orderId: reviews.orderId }).from(reviews).where(inArray(reviews.orderId, orderIds)),
  ]);
  const reviewedSet = new Set(reviewed.map((r) => r.orderId));
  const groups = new Map<string, { store: (typeof rows)[number]["store"]; items: typeof rows }>();
  for (const r of rows) {
    const g = groups.get(r.store.id) ?? { store: r.store, items: [] };
    g.items.push(r);
    groups.set(r.store.id, g);
  }
  return [...groups.values()].map((g) => ({
    ...g,
    items: g.items.map((r) => ({
      ...r,
      files: files.filter((f) => f.productId === r.product.id),
      links: links.filter((l) => l.productId === r.product.id),
      reviewed: reviewedSet.has(r.order.id),
    })),
  }));
}

export default async function MePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [email, sp] = await Promise.all([getBuyerEmail(), searchParams]);

  if (!email) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-12" style={FONT}>
        <div className="mb-6 text-center">
          <p className="text-xs font-medium tracking-widest text-neutral-500 uppercase">visitmy.shop</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Your downloads</h1>
          <p className="mt-2 text-neutral-600">Everything you&apos;ve picked up from any creator, in one place.</p>
        </div>
        <MagicForm initialError={sp.error === "expired" ? "That link has expired or was already used. Request a fresh one." : undefined} />
      </main>
    );
  }

  const library = await loadLibrary(email);
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:py-14" style={FONT}>
      <GaEvent name="library_open" params={{ stores: library.length, items: library.reduce((n, s) => n + s.items.length, 0) }} user={{ user_role: "buyer" }} />
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-widest text-neutral-500 uppercase">visitmy.shop</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Your downloads</h1>
          <p className="mt-1 text-sm text-neutral-600">{email}</p>
        </div>
        <form action={signOutAction}>
          <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm text-neutral-700 transition hover:bg-neutral-50">
            <LogOut className="size-4" /> Sign out
          </button>
        </form>
      </header>

      {library.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-neutral-600">
          <p>Nothing here yet for {email}.</p>
          <p className="mt-1 text-sm">Downloads show up here the moment you claim or buy something with this email.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {library.map(({ store, items }) => {
            const avatar = publicUrl(store.avatarKey);
            return (
              <section key={store.id}>
                <Link href={`/${store.username}`} className="mb-4 inline-flex items-center gap-2.5 text-neutral-900 hover:opacity-80">
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element -- creator upload
                    <img src={avatar} alt="" className="size-8 rounded-full object-cover" />
                  ) : (
                    <span className="grid size-8 place-content-center rounded-full bg-neutral-200 text-sm font-semibold">{store.displayName.charAt(0)}</span>
                  )}
                  <span className="font-semibold">{store.displayName}</span>
                  <span className="text-sm text-neutral-500">@{store.username}</span>
                </Link>
                <ul className="space-y-3">
                  {items.map((it) => (
                    <li key={it.ent.id} className="rounded-2xl border bg-white p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link href={`/${store.username}/${it.product.slug}`} className="font-semibold hover:underline">
                            {it.product.title}
                          </Link>
                          <p className="text-xs text-neutral-500">
                            {it.ent.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            {it.order.amountCents > 0 ? ` · ${(it.order.amountCents / 100).toFixed(2)} ${it.order.currency.toUpperCase()}` : " · Free"}
                          </p>
                        </div>
                        {!it.reviewed && (
                          <Link
                            href={`/${store.username}/${it.product.slug}/thanks?e=${it.ent.token}`}
                            className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50"
                          >
                            <Star className="size-3.5" /> Leave a review
                          </Link>
                        )}
                      </div>
                      {(it.files.length > 0 || it.links.length > 0) && (
                        <ul className="mt-3 flex flex-wrap gap-2">
                          {it.files.map((f) => (
                            <li key={f.id}>
                              <a
                                href={`/d/${it.ent.token}?f=${encodeURIComponent(f.id)}`}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
                              >
                                <Download className="size-4" /> {f.filename}
                              </a>
                            </li>
                          ))}
                          {it.links.map((l) => (
                            <li key={l.id}>
                              <a
                                href={l.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50"
                              >
                                <ArrowUpRight className="size-4" /> {l.label}
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
