"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Tier = "basic" | "pro";

const PRICES: Record<Tier, { month: number; year: number }> = {
  basic: { month: 900, year: 9000 },
  pro: { month: 4900, year: 49000 },
};

const FEATURES: Record<Tier, string[]> = {
  basic: ["Unlimited products", "Your own Stripe payouts", "5% transaction fee", "Storefront always live"],
  pro: ["Everything in Basic", "0% transaction fee", "Design editor & remove branding", "Instagram auto-replies", "Discount codes, order bumps, limits, checkout questions"],
};

function usd(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function Card({ tier, interval, currentTier, trialing }: { tier: Tier; interval: "month" | "year"; currentTier: Tier; trialing: boolean }) {
  const price = PRICES[tier][interval];
  const isCurrent = !trialing && currentTier === tier;
  // While trialing (effective Pro), the Pro card is a "continue"; Basic is a downgrade.
  const label = isCurrent ? "Current plan" : tier === "pro" ? (currentTier === "pro" && trialing ? "Continue on Pro" : "Upgrade to Pro") : "Switch to Basic";
  return (
    <div className={cn("flex flex-col rounded-xl border bg-background p-5", tier === "pro" && "border-foreground/30 ring-1 ring-foreground/10")}>
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold capitalize">{tier}</h3>
        {tier === "pro" && <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-background">Recommended</span>}
      </div>
      <div className="mt-2">
        <span className="text-2xl font-semibold">{usd(price)}</span>
        <span className="text-sm text-muted-foreground">/{interval === "year" ? "yr" : "mo"}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{tier === "pro" ? "0% transaction fee on sales" : "5% transaction fee on sales"}</p>
      <ul className="mt-4 flex-1 space-y-2 text-sm">
        {FEATURES[tier].map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Button asChild className="mt-5 w-full" variant={tier === "pro" ? "default" : "outline"} disabled={isCurrent}>
        {isCurrent ? <span>Current plan</span> : <a href={`/api/billing/checkout?plan=${tier}&interval=${interval}`}>{label}</a>}
      </Button>
    </div>
  );
}

export function PlanCards({ currentTier, trialing }: { currentTier: Tier; trialing: boolean }) {
  const [interval, setInterval] = useState<"month" | "year">("month");
  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border bg-muted/40 p-1 text-sm">
        <button
          type="button"
          onClick={() => setInterval("month")}
          className={cn("rounded-md px-3 py-1 transition-colors", interval === "month" ? "bg-background font-medium shadow-sm" : "text-muted-foreground")}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setInterval("year")}
          className={cn("rounded-md px-3 py-1 transition-colors", interval === "year" ? "bg-background font-medium shadow-sm" : "text-muted-foreground")}
        >
          Annual <span className="text-xs text-muted-foreground">(2 months free)</span>
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card tier="basic" interval={interval} currentTier={currentTier} trialing={trialing} />
        <Card tier="pro" interval={interval} currentTier={currentTier} trialing={trialing} />
      </div>
    </div>
  );
}
