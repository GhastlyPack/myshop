import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { env, stripeConfigured } from "@/lib/env";
import { getStripe } from "@/lib/payments/stripe";
import { handleStripeEvent } from "@/lib/payments/webhook";

export const dynamic = "force-dynamic";

/**
 * Stripe *Connect* webhook endpoint (events from connected accounts; each event
 * carries `event.account`). Subscribe to: checkout.session.completed,
 * checkout.session.async_payment_succeeded, charge.refunded, account.updated,
 * account.application.deauthorized.
 *
 * 400 → bad signature (Stripe will retry). 200 → handled or deliberately ignored.
 */
export async function POST(req: Request) {
  if (!stripeConfigured || !env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "stripe webhook not configured" }, { status: 503 });
  }
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  // Raw body is required for signature verification — never req.json() here.
  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    console.warn("[stripe webhook] bad signature", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  try {
    const result = await handleStripeEvent(event);
    if (!result.handled) console.log(`[stripe webhook] ${event.type} ignored: ${result.reason ?? ""}`);
    return NextResponse.json({ received: true, ...result });
  } catch (e) {
    // Let Stripe retry on genuine failures (DB down, etc.).
    console.error(`[stripe webhook] ${event.type} failed`, e);
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }
}
