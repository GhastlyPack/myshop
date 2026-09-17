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
      const details = { ...acct.details, email: live.email, detailsSubmitted: live.detailsSubmitted, payoutsEnabled: live.payoutsEnabled, currentlyDue: live.currentlyDue, disabledReason: live.disabledReason };
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
        {!acct.chargesEnabled && <Requirements details={acct.details} />}
      </CardContent>
    </Card>
  );
}

const REQUIREMENT_LABELS: Record<string, string> = {
  "external_account": "Add a bank account for payouts",
  "tos_acceptance.date": "Accept Stripe's terms of service",
  "tos_acceptance.ip": "Accept Stripe's terms of service",
  "business_profile.url": "Add your business website or social profile",
  "business_profile.mcc": "Choose your business category",
  "business_profile.product_description": "Describe what you sell",
  "business_type": "Choose your business type",
  "individual.first_name": "Add your legal name",
  "individual.last_name": "Add your legal name",
  "individual.dob.day": "Add your date of birth",
  "individual.address.line1": "Add your address",
  "individual.address.postal_code": "Add your address",
  "individual.ssn_last_4": "Add the last 4 digits of your SSN",
  "individual.id_number": "Add your tax ID number",
  "individual.phone": "Add your phone number",
  "individual.email": "Add your email",
  "individual.verification.document": "Upload an ID document",
  "representative.first_name": "Add the account representative's name",
  "company.name": "Add your company name",
  "company.tax_id": "Add your company tax ID",
};

function humanize(key: string) {
  if (REQUIREMENT_LABELS[key]) return REQUIREMENT_LABELS[key];
  const base = key.split(".").pop() ?? key;
  return base.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

function Requirements({ details }: { details: Record<string, unknown> }) {
  const due = Array.isArray(details.currentlyDue) ? (details.currentlyDue as string[]) : [];
  const reason = typeof details.disabledReason === "string" ? details.disabledReason : null;
  const items = Array.from(new Set(due.map(humanize)));
  return (
    <div className="space-y-2 text-sm text-muted-foreground">
      <p>
        Stripe won&apos;t let this account take payments yet
        {reason ? <span className="font-mono text-xs"> ({reason})</span> : null}. Finish these in your{" "}
        <a href="https://dashboard.stripe.com/account/onboarding" target="_blank" rel="noreferrer" className="underline">
          Stripe dashboard
        </a>
        , then come back and refresh this page:
      </p>
      {items.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5">
          {items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      ) : (
        <p>Stripe hasn&apos;t listed specific items. Open the dashboard and complete the &quot;Activate your account&quot; checklist.</p>
      )}
    </div>
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
