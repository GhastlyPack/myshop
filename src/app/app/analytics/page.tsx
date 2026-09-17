import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireStore } from "@/lib/auth";
import { Funnel } from "./_components/funnel";
import { RangePicker } from "./_components/range-picker";
import { Sparkline, TimeSeriesSwitcher } from "./_components/time-series";
import { getAnalytics, parseRange } from "./queries";

export const metadata: Metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

const num = (n: number) => n.toLocaleString("en-US");
const pct = (n: number, d: number) => (d > 0 ? `${((n / d) * 100).toFixed(1)}%` : "–");
const money = (cents: number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase(), maximumFractionDigits: cents % 100 === 0 ? 0 : 2 }).format(cents / 100);

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { store } = await requireStore();
  const { range } = await searchParams;
  const days = parseRange(range);
  const a = await getAnalytics(store.id, days);
  const { kpis } = a;
  const conversions = kpis.leads + kpis.purchases;

  const tiles: { label: string; value: string; sub?: string; spark?: number[] }[] = [
    { label: "Store views", value: num(kpis.views), spark: a.series.map((p) => p.views) },
    { label: "Product views", value: num(kpis.productViews), spark: a.series.map((p) => p.productViews) },
    { label: "Card clicks", value: num(kpis.clicks), sub: `${pct(kpis.clicks, kpis.views)} of views` },
    { label: "Leads", value: num(kpis.leads), sub: "free claims" },
    { label: "Purchases", value: num(kpis.purchases), spark: a.series.map((p) => p.conversions) },
    { label: "Revenue", value: money(kpis.revenueCents, store.currency), sub: "paid orders" },
    { label: "Downloads", value: num(kpis.downloads) },
    { label: "Conversion", value: pct(conversions, kpis.views), sub: "leads + purchases / views" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">Last {days} days for /{store.username}. Included on every plan.</p>
        </div>
        <RangePicker active={days} />
      </div>

      {kpis.total === 0 ? (
        <EmptyState username={store.username} days={days} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {tiles.map((t) => (
              <Card key={t.label} size="sm" className="gap-2">
                <CardHeader>
                  <CardDescription>{t.label}</CardDescription>
                  <CardTitle className="text-2xl font-semibold tabular-nums tracking-tight">{t.value}</CardTitle>
                </CardHeader>
                <CardContent className="min-h-7">
                  {t.spark ? <Sparkline values={t.spark} /> : t.sub ? <p className="text-xs text-muted-foreground">{t.sub}</p> : null}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Daily activity</CardTitle>
              <CardDescription>Hover or tap the chart for a day&apos;s exact count.</CardDescription>
            </CardHeader>
            <CardContent>
              <TimeSeriesSwitcher
                metrics={[
                  { key: "views", label: "Store views", points: a.series.map((p) => ({ day: p.day, value: p.views })) },
                  { key: "productViews", label: "Product views", points: a.series.map((p) => ({ day: p.day, value: p.productViews })) },
                  { key: "conversions", label: "Conversions", points: a.series.map((p) => ({ day: p.day, value: p.conversions })) },
                ]}
              />
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Funnel</CardTitle>
                <CardDescription>Where visitors drop off.</CardDescription>
              </CardHeader>
              <CardContent>
                <Funnel
                  steps={[
                    { label: "Store views", value: kpis.views },
                    { label: "Product views", value: kpis.productViews },
                    { label: "Checkout starts", value: kpis.checkoutStarts },
                    { label: "Leads + purchases", value: conversions, hint: `${num(kpis.leads)} free, ${num(kpis.purchases)} paid` },
                  ]}
                />
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Traffic sources</CardTitle>
                <CardDescription>
                  From <code className="rounded bg-muted px-1 font-mono text-xs">?src=</code>, UTM tags and referrers. Use <code className="rounded bg-muted px-1 font-mono text-xs">?src=ig</code> in your bio link.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Source</TableHead>
                      <TableHead className="text-right">Views</TableHead>
                      <TableHead className="text-right">Conversions</TableHead>
                      <TableHead className="pr-4 text-right">Conv. %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {a.sources.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="pl-4 text-muted-foreground">
                          No traffic in this range.
                        </TableCell>
                      </TableRow>
                    )}
                    {a.sources.map((s) => (
                      <TableRow key={s.label}>
                        <TableCell className="pl-4 font-medium">{s.label}</TableCell>
                        <TableCell className="text-right tabular-nums">{num(s.views)}</TableCell>
                        <TableCell className="text-right tabular-nums">{num(s.conversions)}</TableCell>
                        <TableCell className="pr-4 text-right tabular-nums text-muted-foreground">{pct(s.conversions, s.views)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top products</CardTitle>
              <CardDescription>Ranked by conversions, then product views.</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Product</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">Conversions</TableHead>
                    <TableHead className="pr-4 text-right">Conv. %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {a.topProducts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="pl-4 text-muted-foreground">
                        No product activity in this range.
                      </TableCell>
                    </TableRow>
                  )}
                  {a.topProducts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="pl-4">
                        <Link href={`/app/products/${p.id}`} className="font-medium hover:underline">
                          {p.title}
                        </Link>
                        <div className="text-xs text-muted-foreground">/{store.username}/{p.slug}</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{num(p.views)}</TableCell>
                      <TableCell className="text-right tabular-nums">{num(p.clicks)}</TableCell>
                      <TableCell className="text-right tabular-nums">{num(p.conversions)}</TableCell>
                      <TableCell className="pr-4 text-right tabular-nums text-muted-foreground">{pct(p.conversions, p.views)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function EmptyState({ username, days }: { username: string; days: number }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <div className="flex size-10 items-center justify-center rounded-full bg-muted">
          <BarChart3 className="size-5 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="font-medium">No activity in the last {days} days</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Views, clicks and conversions show up here as soon as someone opens{" "}
            <a href={`/${username}`} target="_blank" rel="noreferrer" className="underline underline-offset-2">
              /{username}
            </a>
            . Add <code className="rounded bg-muted px-1 font-mono text-xs">?src=ig</code> to your Instagram bio link to see where traffic comes from.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
