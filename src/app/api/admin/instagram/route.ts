import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { instagramAccounts, instagramEvents, instagramReplies } from "@/db/schema";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { env, instagramConfigured } from "@/lib/env";
import { decrypt } from "@/lib/instagram";

export const dynamic = "force-dynamic";

/**
 * Admin-only Instagram diagnostics: for every connected account, ask Instagram
 * what it knows (profile, which apps/fields the account is subscribed to) and
 * show our recent reply log. No tokens are returned.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return NextResponse.json({ error: "admin only" }, { status: 403 });
  const accounts = await db.select().from(instagramAccounts);
  const out = [];
  for (const a of accounts) {
    const token = decrypt(a.tokenEnc);
    const q = async (path: string) => {
      const r = await fetch(`https://graph.instagram.com/v21.0${path}${path.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(token)}`);
      return { status: r.status, body: await r.json().catch(() => null) };
    };
    const [me, subs] = await Promise.all([q(`/me?fields=id,user_id,username,account_type`), q(`/${a.igUserId}/subscribed_apps`)]);
    out.push({
      storeId: a.storeId,
      igUserId: a.igUserId,
      username: a.username,
      active: a.active,
      publicReply: a.publicReply,
      tokenExpiresAt: a.tokenExpiresAt,
      profile: me,
      subscribedApps: subs,
    });
  }
  const replies = await db.select().from(instagramReplies).orderBy(desc(instagramReplies.createdAt)).limit(20);
  const events = await db.select().from(instagramEvents).orderBy(desc(instagramEvents.createdAt)).limit(20);
  return NextResponse.json({
    configured: instagramConfigured,
    appId: env.INSTAGRAM_APP_ID ?? null,
    webhookUrl: `${env.APP_BASE_URL}/api/webhooks/instagram`,
    accounts: out,
    recentWebhookReceipts: events,
    recentReplies: replies,
    at: new Date().toISOString(),
  });
}
