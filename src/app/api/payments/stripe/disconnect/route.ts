import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { paymentAccounts } from "@/db/schema";
import { getCurrentStore } from "@/lib/auth";
import { env, stripeConfigured } from "@/lib/env";
import { deauthorize } from "@/lib/payments/stripe";

export const dynamic = "force-dynamic";

/**
 * Creator-only. Revokes our access to the creator's Stripe account and drops
 * the `payment_accounts` row. Paid products stop being purchasable until they
 * reconnect; past orders and entitlements are untouched.
 */
export async function POST() {
  const store = await getCurrentStore();
  if (!store) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const acct = await db.query.paymentAccounts.findFirst({
    where: and(eq(paymentAccounts.storeId, store.id), eq(paymentAccounts.provider, "stripe")),
  });
  const back = new URL("/app/settings", env.APP_BASE_URL);
  if (!acct) {
    back.searchParams.set("disconnected", "stripe");
    return NextResponse.redirect(back, 303);
  }

  if (stripeConfigured) {
    try {
      await deauthorize(acct.externalId);
    } catch (e) {
      // Already revoked on Stripe's side (or Stripe is down): still forget the account locally.
      console.error("[stripe disconnect] deauthorize failed", e);
    }
  }
  await db.delete(paymentAccounts).where(eq(paymentAccounts.id, acct.id));
  back.searchParams.set("disconnected", "stripe");
  return NextResponse.redirect(back, 303);
}
