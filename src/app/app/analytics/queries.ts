import "server-only";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { events, orders, products } from "@/db/schema";

export const RANGES = [7, 30, 90] as const;
export type RangeDays = (typeof RANGES)[number];

export function parseRange(raw: string | undefined): RangeDays {
  const n = Number(raw);
  return (RANGES as readonly number[]).includes(n) ? (n as RangeDays) : 30;
}

export type Kpis = {
  views: number;
  productViews: number;
  clicks: number;
  checkoutStarts: number;
  leads: number;
  purchases: number;
  downloads: number;
  revenueCents: number;
  total: number;
};

export type DayPoint = { day: string; views: number; productViews: number; conversions: number };

export type TopProduct = { id: string; title: string; slug: string; views: number; clicks: number; conversions: number };

export type SourceRow = { label: string; views: number; conversions: number };

export type Analytics = { days: RangeDays; since: Date; kpis: Kpis; series: DayPoint[]; topProducts: TopProduct[]; sources: SourceRow[] };

const sinceFor = (days: number) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - (days - 1));
  return d;
};

const countIf = (type: string) => sql<number>`count(*) filter (where ${events.type} = ${type})::int`;
const convIf = () => sql<number>`count(*) filter (where ${events.type} in ('lead','purchase'))::int`;

export async function getAnalytics(storeId: string, days: RangeDays): Promise<Analytics> {
  const since = sinceFor(days);
  const scope = and(eq(events.storeId, storeId), gte(events.createdAt, since));

  const [kpiRows, revenueRows, seriesRows, productRows, sourceRows] = await Promise.all([
    db
      .select({
        views: countIf("view"),
        productViews: countIf("product_view"),
        clicks: countIf("click"),
        checkoutStarts: countIf("checkout_start"),
        leads: countIf("lead"),
        purchases: countIf("purchase"),
        downloads: countIf("download"),
        total: sql<number>`count(*)::int`,
      })
      .from(events)
      .where(scope),
    db
      .select({ revenueCents: sql<number>`coalesce(sum(${orders.amountCents}), 0)::int` })
      .from(orders)
      .where(and(eq(orders.storeId, storeId), eq(orders.status, "paid"), gte(orders.createdAt, since))),
    db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${events.createdAt} at time zone 'UTC'), 'YYYY-MM-DD')`,
        views: countIf("view"),
        productViews: countIf("product_view"),
        conversions: convIf(),
      })
      .from(events)
      .where(scope)
      .groupBy(sql`1`)
      .orderBy(sql`1`),
    db
      .select({
        id: products.id,
        title: products.title,
        slug: products.slug,
        views: countIf("product_view"),
        clicks: countIf("click"),
        conversions: convIf(),
      })
      .from(events)
      .innerJoin(products, eq(products.id, events.productId))
      .where(scope)
      .groupBy(products.id, products.title, products.slug)
      .orderBy(desc(convIf()), desc(countIf("product_view")))
      .limit(10),
    db
      .select({
        src: sql<string | null>`${events.source}->>'src'`,
        utm: sql<string | null>`${events.source}->>'utm_source'`,
        referrer: sql<string | null>`${events.source}->>'referrer'`,
        views: countIf("view"),
        conversions: convIf(),
      })
      .from(events)
      .where(scope)
      .groupBy(sql`1`, sql`2`, sql`3`),
  ]);

  const k = kpiRows[0];
  const kpis: Kpis = {
    views: k?.views ?? 0,
    productViews: k?.productViews ?? 0,
    clicks: k?.clicks ?? 0,
    checkoutStarts: k?.checkoutStarts ?? 0,
    leads: k?.leads ?? 0,
    purchases: k?.purchases ?? 0,
    downloads: k?.downloads ?? 0,
    revenueCents: revenueRows[0]?.revenueCents ?? 0,
    total: k?.total ?? 0,
  };

  // Fill every day in the range so the chart has a continuous x axis.
  const byDay = new Map(seriesRows.map((r) => [r.day, r]));
  const series: DayPoint[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setUTCDate(since.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    const r = byDay.get(key);
    series.push({ day: key, views: r?.views ?? 0, productViews: r?.productViews ?? 0, conversions: r?.conversions ?? 0 });
  }

  // Collapse raw source combos into friendly labels.
  const agg = new Map<string, SourceRow>();
  for (const r of sourceRows) {
    const label = sourceLabel(r);
    const cur = agg.get(label) ?? { label, views: 0, conversions: 0 };
    cur.views += r.views;
    cur.conversions += r.conversions;
    agg.set(label, cur);
  }
  const sources = [...agg.values()].sort((a, b) => b.views - a.views || b.conversions - a.conversions);

  return { days, since, kpis, series, topProducts: productRows, sources };
}

const REFERRER_NAMES: Record<string, string> = {
  "instagram.com": "Instagram",
  "www.instagram.com": "Instagram",
  "l.instagram.com": "Instagram",
  "tiktok.com": "TikTok",
  "www.tiktok.com": "TikTok",
  "vm.tiktok.com": "TikTok",
  "youtube.com": "YouTube",
  "www.youtube.com": "YouTube",
  "m.youtube.com": "YouTube",
  "youtu.be": "YouTube",
  "t.co": "X (Twitter)",
  "x.com": "X (Twitter)",
  "twitter.com": "X (Twitter)",
  "threads.net": "Threads",
  "www.threads.net": "Threads",
  "facebook.com": "Facebook",
  "www.facebook.com": "Facebook",
  "l.facebook.com": "Facebook",
  "lm.facebook.com": "Facebook",
  "linkedin.com": "LinkedIn",
  "www.linkedin.com": "LinkedIn",
  "pinterest.com": "Pinterest",
  "www.pinterest.com": "Pinterest",
  "google.com": "Google",
  "www.google.com": "Google",
};

const SRC_NAMES: Record<string, string> = { ig: "Instagram (bio)", tt: "TikTok (bio)", yt: "YouTube", dm: "Instagram (DM)" };

const UTM_NAMES: Record<string, string> = {
  ig: "Instagram",
  instagram: "Instagram",
  tiktok: "TikTok",
  tt: "TikTok",
  youtube: "YouTube",
  yt: "YouTube",
  twitter: "X (Twitter)",
  x: "X (Twitter)",
  facebook: "Facebook",
  fb: "Facebook",
  threads: "Threads",
  linkedin: "LinkedIn",
  pinterest: "Pinterest",
  google: "Google",
  email: "Email",
  newsletter: "Newsletter",
};

function titleCase(s: string) {
  return s.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Friendly label for one events.source shape. Exported for tests and the top-products view. */
export function sourceLabel(s: { src?: string | null; utm?: string | null; referrer?: string | null }): string {
  if (s.src) return SRC_NAMES[s.src.toLowerCase()] ?? titleCase(s.src);
  if (s.utm) {
    const u = s.utm.toLowerCase();
    return UTM_NAMES[u] ?? titleCase(u);
  }
  if (s.referrer) {
    const host = s.referrer.toLowerCase();
    return REFERRER_NAMES[host] ?? host.replace(/^www\./, "");
  }
  return "Direct";
}
