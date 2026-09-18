"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { upgradeToProAction } from "@/app/app/billing/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type BillingMode = "start_trial" | "trialing" | "basic" | "pro" | "resubscribe";

/**
 * The one place a creator changes plans. The trial is billed on Basic, so doing nothing
 * lands them on Basic ($9); upgrading to Pro is the deliberate action, discounted while
 * the trial is still running.
 */
export function BillingChoices({ mode }: { mode: BillingMode }) {
  const router = useRouter();
  const [interval, setInterval] = useState<"month" | "year">("month");
  const [pending, start] = useTransition();
  const proPrice = interval === "year" ? "$490/yr" : "$49/mo";
  // Starting the trial from the billing page is an explicit launch, so publish the draft when it begins.
  const trialHref = `/api/billing/checkout?plan=basic&interval=${interval}&then=publish`;

  function upgrade() {
    start(async () => {
      const res = await upgradeToProAction(interval);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("You're on Pro. Enjoy 0% transaction fees.");
      router.refresh();
    });
  }

  const IntervalToggle = (
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
  );

  if (mode === "pro") {
    return (
      <div className="rounded-xl border bg-background p-5">
        <p className="text-sm text-muted-foreground">You&apos;re on Pro with a 0% transaction fee. Manage your card or plan any time.</p>
        <Button asChild variant="outline" size="sm" className="mt-3">
          <a href="/api/billing/portal">Manage billing</a>
        </Button>
      </div>
    );
  }

  if (mode === "start_trial") {
    return (
      <div className="space-y-3 rounded-xl border border-foreground/20 bg-background p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold">Start your 7-day free trial</h3>
          {IntervalToggle}
        </div>
        <p className="text-sm text-muted-foreground">
          Add a card and get 7 days of full Pro free. When the trial ends it rolls onto Basic ({interval === "year" ? "$90/yr" : "$9/mo"}, 5% fee) unless you upgrade to Pro. Cancel any time before then and you pay nothing.
        </p>
        <Button asChild>
          <a href={trialHref}>Start free trial</a>
        </Button>
      </div>
    );
  }

  // trialing, basic, resubscribe all offer the Pro upgrade; trialing gets the early-bird note.
  return (
    <div className="space-y-4 rounded-xl border bg-background p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold">{mode === "resubscribe" ? "Relaunch your store" : "Upgrade to Pro"}</h3>
        {IntervalToggle}
      </div>

      {mode === "resubscribe" ? (
        <>
          <p className="text-sm text-muted-foreground">Your store is offline. Resubscribe to bring it back — Basic is {interval === "year" ? "$90/yr" : "$9/mo"} (5% fee), or go Pro at {proPrice} (0% fee).</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <a href={`/api/billing/checkout?plan=basic&interval=${interval}`}>Restart on Basic</a>
            </Button>
            <Button asChild>
              <a href={`/api/billing/checkout?plan=pro&interval=${interval}`}>Go Pro — {proPrice}</a>
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {mode === "trialing"
              ? `Keep 0% transaction fees, the design editor, Instagram auto-replies and all the checkout tools after your trial. Upgrade before it ends and save 5% on Pro.`
              : `Drop your transaction fee to 0% and unlock the design editor, Instagram auto-replies, discount codes and more.`}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={upgrade} disabled={pending}>
              {pending ? "Upgrading…" : `Upgrade to Pro — ${proPrice}`}
            </Button>
            <Button asChild variant="outline">
              <a href="/api/billing/portal">Manage billing</a>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
