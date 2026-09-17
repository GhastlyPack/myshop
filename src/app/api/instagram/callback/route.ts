import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { instagramAccounts } from "@/db/schema";
import { getCurrentStore } from "@/lib/auth";
import { env, instagramConfigured } from "@/lib/env";
import { newId } from "@/lib/ids";
import { encrypt, exchangeCode, subscribeWebhooks, verifyState } from "@/lib/instagram";

export const dynamic = "force-dynamic";

const back = (q: string) => NextResponse.redirect(new URL(`/app/settings?${q}`, env.APP_BASE_URL));

/** Instagram redirects here with ?code&state (or ?error). */
export async function GET(req: Request) {
  if (!instagramConfigured) return back("ig_error=not_configured");
  const u = new URL(req.url);
  if (u.searchParams.get("error")) return back(`ig_error=${encodeURIComponent(u.searchParams.get("error_description") ?? u.searchParams.get("error") ?? "denied")}`);
  const code = u.searchParams.get("code");
  const state = u.searchParams.get("state");
  if (!code || !state) return back("ig_error=missing_code");

  const st = await verifyState(state);
  const store = await getCurrentStore();
  if (!st || !store || st.storeId !== store.id) return back("ig_error=bad_state");

  try {
    const { token, expiresIn, igUserId, username } = await exchangeCode(code.replace(/#_$/, ""));
    await subscribeWebhooks(igUserId, token);
    const row = {
      storeId: store.id,
      igUserId,
      username,
      tokenEnc: encrypt(token),
      tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
      active: true,
    };
    // One IG account per store, and one store per IG account: the unique indexes enforce both.
    await db.delete(instagramAccounts).where(eq(instagramAccounts.igUserId, igUserId));
    await db
      .insert(instagramAccounts)
      .values({ id: newId("iga"), ...row })
      .onConflictDoUpdate({ target: instagramAccounts.storeId, set: row });
    return back("connected=instagram");
  } catch (e) {
    console.error("[instagram] connect failed", e);
    return back(`ig_error=${encodeURIComponent((e as Error).message.slice(0, 200))}`);
  }
}
