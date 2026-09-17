import { NextResponse } from "next/server";
import { getCurrentStore, loginPath } from "@/lib/auth";
import { env, instagramConfigured } from "@/lib/env";
import { authorizeUrl, signState } from "@/lib/instagram";

export const dynamic = "force-dynamic";

/** Creator-only: start the Instagram Login OAuth flow. */
export async function GET() {
  if (!instagramConfigured) return NextResponse.redirect(new URL("/app/settings?ig_error=not_configured", env.APP_BASE_URL));
  const store = await getCurrentStore();
  if (!store) return NextResponse.redirect(new URL(loginPath("/app/settings"), env.APP_BASE_URL));
  const state = await signState(store.id);
  return NextResponse.redirect(authorizeUrl(state));
}
