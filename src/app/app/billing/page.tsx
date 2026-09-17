import type { Metadata } from "next";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { PlanCards } from "@/components/app/billing/plan-cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LocalTime } from "@/components/local-time";
import { requireStore } from "@/lib/auth";
import { BASIC_FEE_BPS, resolvePlan } from "@/lib/billing";
import { stripeConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Billing" };
export const dynamic = "force-dynamic";

function daysUntil(d: Date): number {
  return Math.max(0, Math.ceil((d.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}

function thirtyDaysAgo(): Date {
  return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
}

const STATUS_LABEL: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  trialing: { label: "Free trial", variant: "default" },
  active: { label: "Active", variant: "default" },
  past_due: { label: "Payment failed", variant: "destructive" },
  canceled: { label: "Canceled", variant: "secondary" },
  incomplete: { label: "Incomplete", variant: "secondary" },
  none: { label: "No subscription", variant: "secondary" },
};

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ billing?: string; upgrade?: string }> }) {
  const { store } = await requireStore();
  const { billing, upgrade } = await searchParams;
  const plan = await resolvePlan(store);
  const status = STATUS_LABEL[plan.status] ?? STATUS_LABEL.none;

  // "You'd save on Pro": platform fees this store's buyers paid in the last 30 days (Basic only).
  let savedHint: string | null = null;
  if (plan.tier === "basic") {
    const since = thirtyDaysAgo();
    const [row] = await db
      .select({ fees: sql<number>`coalesce(sum(${orders.platformFeeCents}), 0)`.mapWith(Number) })
      .from(orders)
      .where(and(eq(orders.storeId, store.id), eq(orders.status, "paid"), sql`${orders.createdAt} >= ${since.toISOString()}::timestamptz`));
    if (row && row.fees > 0) savedHint = `$${(row.fees / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your plan and transaction fee.</p>
      </div>

      {billing === "success" && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          You&apos;re all set. Your subscription is being confirmed and will show here in a moment.
        </div>
      )}
      {billing === "cancel" && <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">Checkout canceled. No changes were made.</div>}
      {billing === "error" && <div className="rounded-lg border border-destructive/40 bg-background px-4 py-3 text-sm text-destructive">Something went wrong starting billing. Please try again.</div>}
      {billing === "unconfigured" && <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">Billing isn&apos;t enabled on this deployment yet.</div>}
      {upgrade && !billing && (
        <div className="rounded-lg border border-foreground/20 bg-muted/40 px-4 py-3 text-sm">That&apos;s a Pro feature. Upgrade below to unlock it.</div>
      )}

      {/* Current plan */}
      <section className="space-y-3 rounded-xl border bg-background p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold capitalize">{plan.tier}</span>
            <Badge variant={status.variant}>{status.label}</Badge>
            {plan.grandfathered && <Badge variant="secondary">Comped</Badge>}
          </div>
          {plan.manageable && (
            <Button asChild variant="outline" size="sm">
              <a href="/api/billing/portal">Manage billing</a>
            </Button>
          )}
        </div>
        {plan.grandfathered ? (
          <p className="text-sm text-muted-foreground">You&apos;re on Pro for free — no card, no expiry. Thanks for being an early creator.</p>
        ) : plan.trialing && plan.trialEndsAt ? (
          <p className="text-sm text-muted-foreground">
            Free Pro trial — {daysUntil(plan.trialEndsAt)} day{daysUntil(plan.trialEndsAt) === 1 ? "" : "s"} left (ends <LocalTime date={plan.trialEndsAt} mode="date" />). After
            that you&apos;ll fall to Basic terms unless you subscribe.
          </p>
        ) : plan.status === "active" ? (
          <p className="text-sm text-muted-foreground">
            {plan.tier === "pro" ? "0% transaction fee on your sales." : "5% transaction fee on your sales."}
            {plan.currentPeriodEnd && (
              <>
                {" "}
                {plan.cancelAtPeriodEnd ? "Ends " : "Renews "}
                <LocalTime date={plan.currentPeriodEnd} mode="date" />.
              </>
            )}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Your trial has ended. You&apos;re on Basic terms — a 5% fee applies to your sales until you upgrade.</p>
        )}
        {savedHint && <p className="text-sm">In the last 30 days you paid <span className="font-semibold">{savedHint}</span> in transaction fees. On Pro that would be $0.</p>}
      </section>

      {/* Plan picker */}
      {plan.grandfathered ? null : stripeConfigured ? (
        <PlanCards currentTier={plan.tier} trialing={plan.trialing} />
      ) : (
        <div className="rounded-xl border bg-muted/40 p-5 text-sm text-muted-foreground">Plan changes will be available once billing is enabled on this deployment.</div>
      )}

      <p className="text-xs text-muted-foreground">
        Basic is {`$9/mo`} or {`$90/yr`} with a {BASIC_FEE_BPS / 100}% transaction fee. Pro is {`$49/mo`} or {`$490/yr`} with no transaction fee. Prices in USD.
      </p>
    </div>
  );
}
