import Link from "next/link";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireStore } from "@/lib/auth";
import { stripeConfigured } from "@/lib/env";
import { getStripeAccount } from "@/lib/payments/checkout";
import { formatDateTime, formatMoney } from "@/lib/payments/money";
import { incomeSummary, listOrders, ORDER_STATUSES, parseStatus, type OrderStatus } from "@/lib/payments/reports";
import { cn } from "@/lib/utils";
import { refundOrderAction } from "./actions";
import { RefundButton } from "./refund-button";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<OrderStatus, string> = { pending: "Pending", paid: "Paid", refunded: "Refunded", failed: "Failed" };
const STATUS_VARIANT: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
  paid: "default",
  pending: "outline",
  refunded: "secondary",
  failed: "destructive",
};

export default async function IncomePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; msg?: string; error?: string }>;
}) {
  const { store } = await requireStore();
  const sp = await searchParams;
  const status = parseStatus(sp.status);

  const [summary, rows, acct] = await Promise.all([
    incomeSummary(store.id),
    listOrders(store.id, { status, limit: 200 }),
    stripeConfigured ? getStripeAccount(store.id) : Promise.resolve(null),
  ]);
  const canRefund = stripeConfigured && Boolean(acct);
  const cur = store.currency;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Income</h1>
          <p className="text-sm text-muted-foreground">Every order on your store. Stripe payouts go straight to your account.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href="/app/income/export">
            <Download /> Export CSV
          </a>
        </Button>
      </div>

      {sp.msg && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{sp.msg}</div>}
      {sp.error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{sp.error}</div>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Last 30 days" value={formatMoney(summary.gross30Cents, cur)} />
        <Tile label="All time" value={formatMoney(summary.allTimeCents, cur)} />
        <Tile label="Orders" value={summary.ordersCount.toLocaleString()} />
        <Tile
          label="Refunds"
          value={formatMoney(summary.refundsCents, cur)}
          hint={summary.refundsCount ? `${summary.refundsCount} refunded` : undefined}
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <FilterChip href="/app/income" active={!status}>
          All
        </FilterChip>
        {ORDER_STATUSES.map((s) => (
          <FilterChip key={s} href={`/app/income?status=${s}`} active={status === s}>
            {STATUS_LABEL[s]}
          </FilterChip>
        ))}
      </div>

      <Card className="py-0">
        <CardContent className="px-0">
          {rows.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              {status ? `No ${STATUS_LABEL[status].toLowerCase()} orders yet.` : "No orders yet. Share your store link to get the first one."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="hidden md:table-cell">Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(o.createdAt)}</TableCell>
                    <TableCell className="max-w-[16rem] truncate font-medium">{o.productTitle}</TableCell>
                    <TableCell>
                      <div className="truncate">{o.buyerName || "—"}</div>
                      <div className="truncate text-xs text-muted-foreground">{o.buyerEmail}</div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums">
                      {o.provider === "free" || o.amountCents === 0 ? <span className="text-muted-foreground">Free</span> : formatMoney(o.amountCents, o.currency)}
                    </TableCell>
                    <TableCell className="hidden capitalize text-muted-foreground md:table-cell">{o.provider}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[o.status]}>{STATUS_LABEL[o.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {o.status === "paid" && o.provider === "stripe" && canRefund && (
                        <RefundButton orderId={o.id} status={status ?? ""} amountLabel={formatMoney(o.amountCents, o.currency)} action={refundOrderAction} />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      {rows.length >= 200 && <p className="text-xs text-muted-foreground">Showing the latest 200 orders. Export CSV for the full history.</p>}
    </div>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="gap-1 py-4">
      <CardHeader className="px-4">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </Link>
  );
}
