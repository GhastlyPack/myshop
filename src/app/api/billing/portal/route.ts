import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createPortalSession } from "@/lib/billing";
import { env, stripeConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * GET /api/billing/portal
 * Opens the Stripe Billing Customer Portal (card, cancel, switch plan) and
 * redirects there. Only Stripe needs to be configured.
 */
export async function GET() {
  const billingUrl = `${env.APP_BASE_URL}/app/billing`;
  if (!stripeConfigured) return NextResponse.redirect(`${billingUrl}?billing=unconfigured`, { status: 303 });

  const user = await requireUser();
  try {
    const url = await createPortalSession(user, billingUrl);
    return NextResponse.redirect(url, { status: 303 });
  } catch (e) {
    console.error("[billing portal] failed", e);
    return NextResponse.redirect(`${billingUrl}?billing=error`, { status: 303 });
  }
}
