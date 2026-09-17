import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, sql } from "drizzle-orm";
import { MessageSquare, Star } from "lucide-react";
import { db } from "@/db";
import { products, reviews } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireStore } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { ReviewActions } from "./_components/review-actions";

export const metadata: Metadata = { title: "Reviews" };
export const dynamic = "force-dynamic";

const TABS = ["pending", "approved", "all"] as const;
type Tab = (typeof TABS)[number];

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { store } = await requireStore();
  const { tab: rawTab } = await searchParams;
  const tab: Tab = (TABS as readonly string[]).includes(rawTab ?? "") ? (rawTab as Tab) : "pending";

  const storeScope = eq(products.storeId, store.id);
  const [counts, rows] = await Promise.all([
    db
      .select({
        pending: sql<number>`count(*) filter (where ${reviews.approved} = false)::int`,
        approved: sql<number>`count(*) filter (where ${reviews.approved} = true)::int`,
        all: sql<number>`count(*)::int`,
      })
      .from(reviews)
      .innerJoin(products, eq(products.id, reviews.productId))
      .where(storeScope),
    db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        quote: reviews.quote,
        reviewerName: reviews.reviewerName,
        approved: reviews.approved,
        createdAt: reviews.createdAt,
        productId: products.id,
        productTitle: products.title,
        productSlug: products.slug,
      })
      .from(reviews)
      .innerJoin(products, eq(products.id, reviews.productId))
      .where(tab === "all" ? storeScope : and(storeScope, eq(reviews.approved, tab === "approved")))
      .orderBy(desc(reviews.createdAt))
      .limit(200),
  ]);
  const c = counts[0] ?? { pending: 0, approved: 0, all: 0 };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            Reviews
            {c.pending > 0 && <Badge>{c.pending} pending</Badge>}
          </h1>
          <p className="text-sm text-muted-foreground">Buyers rate a product after downloading. Approved reviews show on the product page.</p>
        </div>
      </div>

      <div className="inline-flex rounded-lg border bg-background p-0.5" role="tablist">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/app/reviews?tab=${t}`}
            role="tab"
            aria-selected={t === tab}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors",
              t === tab ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {t} <span className="tabular-nums opacity-70">{c[t]}</span>
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <MessageSquare className="size-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">{tab === "pending" ? "Nothing to moderate" : "No reviews yet"}</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                {tab === "pending" ? "New reviews land here first. Approve them to show them on your product pages." : "Reviews arrive after buyers download a product."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Card size="sm">
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Stars rating={r.rating} />
                        <Link href={`/app/products/${r.productId}`} className="truncate text-sm font-medium hover:underline">
                          {r.productTitle}
                        </Link>
                        {r.approved ? <Badge variant="outline">Approved</Badge> : <Badge variant="secondary">Pending</Badge>}
                      </div>
                      {r.quote ? <p className="text-sm leading-relaxed">&ldquo;{r.quote}&rdquo;</p> : <p className="text-sm italic text-muted-foreground">Rating only, no written review.</p>}
                      <p className="text-xs text-muted-foreground">
                        {r.reviewerName?.trim() || "Anonymous"} · {r.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <ReviewActions id={r.id} approved={r.approved} />
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`} title={`${rating}/5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={cn("size-3.5", i < rating ? "fill-foreground text-foreground" : "text-muted-foreground/40")} aria-hidden />
      ))}
    </span>
  );
}
