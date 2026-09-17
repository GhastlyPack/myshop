import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { instagramAccounts, instagramReplies } from "@/db/schema";
import { env } from "@/lib/env";
import { newId } from "@/lib/ids";
import { parseSignedRequest } from "@/lib/instagram";

export const dynamic = "force-dynamic";

/**
 * Meta data-deletion callback. We drop the connection and the reply log for that
 * account, and answer with a status URL + confirmation code as Meta requires.
 */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const data = parseSignedRequest(form?.get("signed_request")?.toString() ?? null);
  if (!data?.user_id) return NextResponse.json({ error: "bad signed_request" }, { status: 400 });
  const igUserId = String(data.user_id);
  const acct = await db.query.instagramAccounts.findFirst({ where: eq(instagramAccounts.igUserId, igUserId) });
  if (acct) {
    await db.delete(instagramReplies).where(eq(instagramReplies.fromIgUserId, igUserId));
    await db.delete(instagramAccounts).where(eq(instagramAccounts.id, acct.id));
  }
  const code = newId("del");
  return NextResponse.json({ url: `${env.APP_BASE_URL}/privacy#deletion`, confirmation_code: code });
}
