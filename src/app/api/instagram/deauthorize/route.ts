import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { instagramAccounts } from "@/db/schema";
import { parseSignedRequest } from "@/lib/instagram";

export const dynamic = "force-dynamic";

/** Meta calls this when a creator removes our app from their Instagram account. */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const data = parseSignedRequest(form?.get("signed_request")?.toString() ?? null);
  if (!data?.user_id) return NextResponse.json({ error: "bad signed_request" }, { status: 400 });
  await db.delete(instagramAccounts).where(eq(instagramAccounts.igUserId, String(data.user_id)));
  return NextResponse.json({ ok: true });
}
