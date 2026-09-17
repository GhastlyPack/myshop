"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { products, reviews } from "@/db/schema";
import { requireStore } from "@/lib/auth";
import { revalidateStore } from "@/lib/queries";

const idSchema = z.string().min(1).max(64);

/** Resolve a review only if it belongs to one of the current store's products. */
async function ownedReview(reviewId: string) {
  const { store } = await requireStore();
  const id = idSchema.parse(reviewId);
  const [row] = await db
    .select({ id: reviews.id })
    .from(reviews)
    .innerJoin(products, eq(products.id, reviews.productId))
    .where(and(eq(reviews.id, id), eq(products.storeId, store.id)))
    .limit(1);
  if (!row) throw new Error("Review not found");
  return { store, id: row.id };
}

function done(username: string) {
  revalidateStore(username);
  revalidatePath("/app/reviews");
  return { ok: true as const };
}

export async function approveReview(reviewId: string) {
  const { store, id } = await ownedReview(reviewId);
  await db.update(reviews).set({ approved: true }).where(eq(reviews.id, id));
  return done(store.username);
}

export async function hideReview(reviewId: string) {
  const { store, id } = await ownedReview(reviewId);
  await db.update(reviews).set({ approved: false }).where(eq(reviews.id, id));
  return done(store.username);
}

export async function deleteReview(reviewId: string) {
  const { store, id } = await ownedReview(reviewId);
  await db.delete(reviews).where(eq(reviews.id, id));
  return done(store.username);
}
