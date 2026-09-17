import { NextResponse } from "next/server";
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { downloads, entitlements, orders, productFiles } from "@/db/schema";
import { newId } from "@/lib/ids";
import { signedDownloadUrl } from "@/lib/storage";
import { track } from "@/lib/track";

export const dynamic = "force-dynamic";

const RATE_LIMIT = 30; // downloads per entitlement per window
const RATE_WINDOW_MS = 60 * 60 * 1000;

/**
 * Signed download redirect: /d/<entitlement token>?f=<fileId>
 * Verifies the entitlement (not revoked, order paid) and that the file belongs
 * to the product, logs the download, then 302s to a short-lived signed URL.
 */
export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const fileId = new URL(req.url).searchParams.get("f");
  if (!token || token.length > 80 || !fileId || fileId.length > 64) return notFound();

  const ent = await db.query.entitlements.findFirst({ where: and(eq(entitlements.token, token), eq(entitlements.revoked, false)) });
  if (!ent) return notFound();
  const order = await db.query.orders.findFirst({ where: eq(orders.id, ent.orderId) });
  if (!order || order.status !== "paid") return notFound();
  const file = await db.query.productFiles.findFirst({ where: and(eq(productFiles.id, fileId), eq(productFiles.productId, ent.productId)) });
  if (!file) return notFound();

  // Rate limit per entitlement: a leaked link can't be hammered. Durable across lambdas (counts the log table).
  const since = new Date(Date.now() - RATE_WINDOW_MS);
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(downloads)
    .where(and(eq(downloads.entitlementId, ent.id), gt(downloads.createdAt, since)));
  if (n >= RATE_LIMIT) {
    return new NextResponse("Too many downloads. Try again in an hour.", { status: 429, headers: { "Retry-After": String(RATE_WINDOW_MS / 1000) } });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? null;
  const ua = req.headers.get("user-agent")?.slice(0, 500) ?? null;
  await db.insert(downloads).values({ id: newId("dl"), entitlementId: ent.id, fileId: file.id, ip, userAgent: ua }).catch((e) => console.error("[download log]", e));
  await track({ storeId: order.storeId, productId: ent.productId, type: "download", source: order.source });

  const url = await signedDownloadUrl(file.storageKey, file.filename);
  return NextResponse.redirect(new URL(url, req.url), { status: 302, headers: { "Cache-Control": "private, no-store" } });
}

function notFound() {
  return new NextResponse("Not found", { status: 404 });
}
