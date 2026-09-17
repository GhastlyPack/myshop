import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createBillingCheckout, lookupKeyFor } from "@/lib/billing";
import { env, stripeConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  plan: z.enum(["basic", "pro"]),
  interval: z.enum(["month", "year"]).default("month"),
});

/**
 * GET /api/billing/checkout?plan=basic&interval=month
 * Starts a Stripe Checkout Session (subscription) and redirects to the hosted page.
 * Only Stripe needs to be configured (not the billing webhook secret).
 */
export async function GET(req: Request) {
  const billingUrl = `${env.APP_BASE_URL}/app/billing`;
  if (!stripeConfigured) return NextResponse.redirect(`${billingUrl}?billing=unconfigured`, { status: 303 });

  const user = await requireUser();
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({ plan: searchParams.get("plan"), interval: searchParams.get("interval") ?? undefined });
  if (!parsed.success) return NextResponse.redirect(`${billingUrl}?billing=error`, { status: 303 });

  try {
    const url = await createBillingCheckout({ user, lookupKey: lookupKeyFor(parsed.data.plan, parsed.data.interval), returnUrl: billingUrl });
    return NextResponse.redirect(url, { status: 303 });
  } catch (e) {
    console.error("[billing checkout] failed", e);
    return NextResponse.redirect(`${billingUrl}?billing=error`, { status: 303 });
  }
}
