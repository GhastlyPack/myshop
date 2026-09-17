"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { entitlements, orders, reviews } from "@/db/schema";
import { newId } from "@/lib/ids";

export type ReviewState = { ok: true } | { error: string } | null;

const schema = z.object({
  token: z.string().min(10).max(80),
  rating: z.coerce.number().int().min(1).max(5),
  quote: z.string().trim().max(600).optional(),
  name: z.string().trim().max(80).optional(),
});

/** Buyer review from the thanks page. Keyed by the entitlement token so only the buyer can leave one; one per order. */
export async function submitReview(_prev: ReviewState, fd: FormData): Promise<ReviewState> {
  const parsed = schema.safeParse({ token: fd.get("token"), rating: fd.get("rating"), quote: fd.get("quote") || undefined, name: fd.get("name") || undefined });
  if (!parsed.success) return { error: "Pick a star rating first." };
  const { token, rating, quote, name } = parsed.data;

  const ent = await db.query.entitlements.findFirst({ where: eq(entitlements.token, token) });
  if (!ent || ent.revoked) return { error: "We couldn't find your order." };
  const order = await db.query.orders.findFirst({ where: eq(orders.id, ent.orderId) });
  if (!order || order.status !== "paid") return { error: "Reviews open once your order is confirmed." };

  await db
    .insert(reviews)
    .values({ id: newId("rev"), productId: ent.productId, orderId: order.id, rating, quote: quote || null, reviewerName: name || order.buyerName.split(" ")[0] || null, approved: false })
    .onConflictDoNothing();
  return { ok: true };
}
