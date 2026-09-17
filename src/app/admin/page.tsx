import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { formatBytes, getAdminOverview } from "./queries";

export const metadata: Metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

const num = (n: number) => n.toLocaleString("en-US");
const usd = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
const when = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default async function AdminOverview() {
  await requireAdmin();
  let o: Awaited<ReturnType<typeof getAdminOverview>>;
  try {
    o = await getAdminOverview();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[admin] overview failed:", message);
    return (
      <div className="space-y-3 rounded-xl border border-destructive/40 bg-background p-5">
        <h1 className="text-lg font-semibold">Overview couldn&apos;t load</h1>
        <p className="text-sm text-muted-foreground">A step stalled or failed. This is the exact step, for debugging:</p>
        <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">{message}</pre>
        <p className="text-xs text-muted-foreground">
          Try <Link href="/admin/team" className="underline">Team</Link> or <Link href="/admin/stores" className="underline">Stores</Link>, and{" "}
          <Link href="/api/admin/health" className="underline">health</Link>.
        </p>
      </div>
    );
  }

  const tiles = [
    { label: "Users", value: num(o.users) },
    { label: "Stores", value: num(o.stores), sub: `${num(o.storesPublished)} published` },
    { label: "Published products", value: num(o.productsPublished), sub: `${num(o.products)} total` },
    { label: "Paid orders", value: num(o.paidOrders), sub: `${usd(o.revenueCents)} all-time` },
    { label: "Storage", value: formatBytes(o.storageBytes), sub: `${num(o.files)} files` },
    { label: "Events, last 24h", value: num(o.events24h) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">Platform-wide totals. Read-only.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {tiles.map((t) => (
          <Card key={t.label} size="sm" className="gap-1">
            <CardHeader>
              <CardDescription>{t.label}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums tracking-tight">{t.value}</CardTitle>
            </CardHeader>
            {t.sub && (
              <CardContent>
                <p className="text-xs text-muted-foreground">{t.sub}</p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent signups</CardTitle>
            <CardDescription>Latest 10 users.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">User</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead className="pr-4 text-right">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {o.recentSignups.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="pl-4">
                      <div className="font-medium">{u.email}</div>
                      <div className="text-xs text-muted-foreground">
                        {u.name ?? "—"}
                        {u.role === "admin" && (
                          <Badge variant="outline" className="ml-1.5">
                            admin
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {u.username ? (
                        <a href={`/${u.username}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
                          /{u.username} <ExternalLink className="size-3 text-muted-foreground" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">no store</span>
                      )}
                    </TableCell>
                    <TableCell className="pr-4 text-right text-muted-foreground">{when(u.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top stores by orders</CardTitle>
            <CardDescription>
              Paid orders, all-time.{" "}
              <Link href="/admin/stores" className="underline underline-offset-2">
                All stores
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Store</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="pr-4 text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {o.topStores.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="pl-4 text-muted-foreground">
                      No paid orders yet.
                    </TableCell>
                  </TableRow>
                )}
                {o.topStores.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="pl-4">
                      <div className="font-medium">{s.displayName}</div>
                      <a href={`/${s.username}`} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:underline">
                        /{s.username}
                      </a>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{num(s.orders)}</TableCell>
                    <TableCell className="pr-4 text-right tabular-nums">{usd(s.revenueCents)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
