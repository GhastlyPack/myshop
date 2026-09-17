import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { billingConfigured, env, stripeConfigured } from "@/lib/env";
import { handleBillingEvent } from "@/lib/billing-webhook";
import { getStripe } from "@/lib/payments/stripe";

export const dynamic = "force-dynamic";

/**
 * Stripe *platform-account* webhook for OUR subscription billing (the creator
 * pays us). This is a SEPARATE Stripe webhook endpoint from the Connect one at
 * /api/webhooks/stripe — add it in the dashboard as an "your account" (not
 * Connect) endpoint with its own signing secret → STRIPE_BILLING_WEBHOOK_SECRET.
 *
 * Subscribe to: checkout.session.completed, customer.subscription.created,
 * customer.subscription.updated, customer.subscription.deleted,
 * invoice.payment_failed.
 *
 * 503 → not configured. 400 → bad signature (Stripe retries). 200 → handled/ignored.
 */
export async function POST(req: Request) {
  if (!stripeConfigured || !billingConfigured || !env.STRIPE_BILLING_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "billing webhook not configured" }, { status: 503 });
  }
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  // Raw body for signature verification — never req.json() here.
  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, sig, env.STRIPE_BILLING_WEBHOOK_SECRET);
  } catch (e) {
    console.warn("[billing webhook] bad signature", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  try {
    const result = await handleBillingEvent(event);
    if (!result.handled) console.log(`[billing webhook] ${event.type} ignored: ${result.reason ?? ""}`);
    return NextResponse.json({ received: true, ...result });
  } catch (e) {
    console.error(`[billing webhook] ${event.type} failed`, e);
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "method not allowed" }, { status: 405 });
}
