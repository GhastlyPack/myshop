import { NextResponse } from "next/server";
import { db } from "@/db";
import { paymentAccounts } from "@/db/schema";
import { getCurrentStore, loginPath } from "@/lib/auth";
import { env, stripeConfigured } from "@/lib/env";
import { newId } from "@/lib/ids";
import { verifyConnectState } from "@/lib/payments/connect-state";
import { exchangeCode, getAccountStatus } from "@/lib/payments/stripe";

export const dynamic = "force-dynamic";

function settings(params: Record<string, string>) {
  const u = new URL("/app/settings", env.APP_BASE_URL);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return NextResponse.redirect(u);
}

/**
 * Stripe sends the creator back here after OAuth. Verifies our signed `state`,
 * swaps the `code` for the connected account id, snapshots the account's
 * status, and upserts `payment_accounts` for the store.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams;

  // User cancelled / Stripe declined: e.g. ?error=access_denied&error_description=...
  const error = q.get("error");
  if (error) {
    const desc = q.get("error_description") ?? "";
    return settings({ connect_error: error === "access_denied" ? "cancelled" : `${error}${desc ? `: ${desc.slice(0, 120)}` : ""}` });
  }

  if (!stripeConfigured) return settings({ connect_error: "not_configured" });

  const code = q.get("code");
  const state = q.get("state");
  if (!code || !state) return settings({ connect_error: "missing_code" });

  const verified = await verifyConnectState(state);
  if (!verified) return settings({ connect_error: "invalid_state" });

  // The signed-in creator must own the store the flow started for.
  const store = await getCurrentStore();
  if (!store) return NextResponse.redirect(new URL(loginPath("/app/settings"), env.APP_BASE_URL));
  if (store.id !== verified.storeId) return settings({ connect_error: "store_mismatch" });

  try {
    const { accountId, livemode } = await exchangeCode(code);
    const status = await getAccountStatus(accountId).catch(() => ({ chargesEnabled: false, detailsSubmitted: false, email: null }));
    const details = { email: status.email, detailsSubmitted: status.detailsSubmitted, livemode };
    await db
      .insert(paymentAccounts)
      .values({ id: newId("pay"), storeId: store.id, provider: "stripe", externalId: accountId, chargesEnabled: status.chargesEnabled, details })
      .onConflictDoUpdate({
        target: [paymentAccounts.storeId, paymentAccounts.provider],
        set: { externalId: accountId, chargesEnabled: status.chargesEnabled, details },
      });
    return settings({ connected: "stripe" });
  } catch (e) {
    console.error("[stripe connect] callback failed", e);
    return settings({ connect_error: "exchange_failed" });
  }
}
