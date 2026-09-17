import { and, eq } from "drizzle-orm";
import { CheckCircle2, CircleDashed } from "lucide-react";
import { db } from "@/db";
import { paymentAccounts } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { paypalConfigured, stripeConfigured } from "@/lib/env";
import { getAccountStatus } from "@/lib/payments/stripe";
import { StripeDisconnectButton } from "./stripe-disconnect-button";

/**
 * Payments card rendered inside /app/settings (Package A). Server component.
 * Reads the store's connected Stripe account and refreshes its status from
 * Stripe on render (best effort) so `chargesEnabled` stays honest.
 */
export async function PaymentsSettings({ storeId }: { storeId: string }) {
  return (
    <div className="space-y-4">
      <StripeCard storeId={storeId} />
      <PayPalCard />
      <p className="text-xs text-muted-foreground">Buyers pay you directly. Payouts follow your Stripe schedule.</p>
    </div>
  );
}

async function StripeCard({ storeId }: { storeId: string }) {
  if (!stripeConfigured) {
    return (
      <Card className="border-dashed bg-muted/40">
        <CardHeader>
          <CardTitle className="text-base">Stripe</CardTitle>
          <CardDescription>Stripe isn&apos;t configured on this deployment yet. Free products keep working.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  let acct = await db.query.paymentAccounts.findFirst({
    where: and(eq(paymentAccounts.storeId, storeId), eq(paymentAccounts.provider, "stripe")),
  });

  if (acct) {
    // Best-effort live refresh; keep the stored snapshot if Stripe is unreachable.
    try {
      const live = await getAccountStatus(acct.externalId);
      const details = { ...acct.details, email: live.email, detailsSubmitted: live.detailsSubmitted };
      if (live.chargesEnabled !== acct.chargesEnabled || JSON.stringify(details) !== JSON.stringify(acct.details)) {
        [acct] = await db
          .update(paymentAccounts)
          .set({ chargesEnabled: live.chargesEnabled, details })
          .where(eq(paymentAccounts.id, acct.id))
          .returning();
      }
    } catch (e) {
      console.error("[payments-settings] status refresh failed", e);
    }
  }

  if (!acct) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stripe</CardTitle>
          <CardDescription>Connect your Stripe account to sell paid products. Apple Pay, Google Pay and Link included.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <a href="/api/payments/stripe/connect">Connect Stripe</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const email = typeof acct.details.email === "string" ? acct.details.email : null;
  const detailsSubmitted = Boolean(acct.details.detailsSubmitted);
  const livemode = acct.details.livemode;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">Stripe</CardTitle>
            <CardDescription>
              Connected{email ? ` as ${email}` : ""}
              <span className="ml-1 font-mono text-xs text-muted-foreground/80">({acct.externalId})</span>
            </CardDescription>
          </div>
          <StripeDisconnectButton />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {acct.chargesEnabled ? (
            <Badge variant="default">
              <CheckCircle2 /> Charges enabled
            </Badge>
          ) : (
            <Badge variant="destructive">
              <CircleDashed /> Charges disabled
            </Badge>
          )}
          {detailsSubmitted ? (
            <Badge variant="secondary">
              <CheckCircle2 /> Details complete
            </Badge>
          ) : (
            <Badge variant="outline">
              <CircleDashed /> Details pending
            </Badge>
          )}
          {livemode === false && <Badge variant="outline">Test mode</Badge>}
        </div>
        {!acct.chargesEnabled && (
          <p className="text-sm text-muted-foreground">
            Stripe still needs a few details before you can take payments. Finish onboarding in your{" "}
            <a href="https://dashboard.stripe.com/" target="_blank" rel="noreferrer" className="underline">
              Stripe dashboard
            </a>
            , then come back and refresh.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function PayPalCard() {
  if (paypalConfigured) {
    return (
      <Card className="border-dashed bg-muted/40">
        <CardHeader>
          <CardTitle className="text-base">PayPal</CardTitle>
          <CardDescription>PayPal connect lands in the next payments milestone.</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  return (
    <Card className="border-dashed bg-muted/40">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">PayPal</CardTitle>
          <Badge variant="outline">Coming soon</Badge>
        </div>
        <CardDescription>Let buyers pay with their PayPal balance. Not available yet.</CardDescription>
      </CardHeader>
    </Card>
  );
}
