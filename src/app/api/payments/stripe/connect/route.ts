import { NextResponse } from "next/server";
import { getCurrentStore, loginPath } from "@/lib/auth";
import { env, stripeConfigured } from "@/lib/env";
import { signConnectState } from "@/lib/payments/connect-state";
import { connectUrl } from "@/lib/payments/stripe";

export const dynamic = "force-dynamic";

/**
 * Creator-only. Starts Stripe Connect (Standard) OAuth: signs a short-lived
 * `state` bound to the store, then sends the creator to Stripe.
 */
export async function GET() {
  const store = await getCurrentStore();
  if (!store) return NextResponse.redirect(new URL(loginPath("/app/settings"), env.APP_BASE_URL));
  if (!stripeConfigured) {
    return NextResponse.redirect(new URL("/app/settings?connect_error=not_configured", env.APP_BASE_URL));
  }
  const state = await signConnectState(store.id);
  return NextResponse.redirect(connectUrl(store.id, state));
}
