import { Download, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireStore } from "@/lib/auth";
import { formatMoney } from "@/lib/payments/money";
import { LocalTime } from "@/components/local-time";
import { countCustomers, listCustomers } from "@/lib/payments/reports";

export const dynamic = "force-dynamic";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { store } = await requireStore();
  const { q = "" } = await searchParams;
  const query = q.trim().slice(0, 120);

  const [rows, counts] = await Promise.all([listCustomers(store.id, { q: query, limit: 200 }), countCustomers(store.id)]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">
            {counts.total.toLocaleString()} {counts.total === 1 ? "buyer" : "buyers"} · {counts.optIns.toLocaleString()} opted in to marketing
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <a href="/app/customers/export">
              <Download /> Export all
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href="/app/customers/export?optin=1">
              <Download /> Marketing opt-ins only
            </a>
          </Button>
        </div>
      </div>

      <form method="get" action="/app/customers" className="flex max-w-md items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={query} placeholder="Search by email or name" className="pl-8" aria-label="Search customers" />
        </div>
        <Button type="submit" variant="secondary" size="sm">
          Search
        </Button>
        {query && (
          <Button asChild variant="ghost" size="sm">
            <a href="/app/customers">Clear</a>
          </Button>
        )}
      </form>

      <Card className="py-0">
        <CardContent className="px-0">
          {rows.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              {query ? `No customers match “${query}”.` : "No customers yet. Every buyer and free-download lead shows up here."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>First seen</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Total spent</TableHead>
                  <TableHead>Marketing</TableHead>
                  <TableHead>Products</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.email}>
                    <TableCell>
                      <div className="truncate font-medium">{c.name || "—"}</div>
                      <div className="truncate text-xs text-muted-foreground">{c.email}</div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground"><LocalTime date={c.firstSeen} mode="date" /></TableCell>
                    <TableCell className="text-right tabular-nums">{c.ordersCount}</TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums">
                      {c.totalSpentCents > 0 ? formatMoney(c.totalSpentCents, store.currency) : <span className="text-muted-foreground">Free</span>}
                    </TableCell>
                    <TableCell>
                      {c.marketingOptIn ? <Badge variant="default">Opted in</Badge> : <Badge variant="outline">No</Badge>}
                    </TableCell>
                    <TableCell className="max-w-[18rem]">
                      <div className="flex flex-wrap gap-1">
                        {c.products.map((p) => (
                          <Badge key={p} variant="secondary" className="max-w-full truncate">
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      {rows.length >= 200 && <p className="text-xs text-muted-foreground">Showing 200 customers. Export CSV for the full list.</p>}
    </div>
  );
}
