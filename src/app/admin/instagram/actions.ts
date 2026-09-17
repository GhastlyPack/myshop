"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { instagramBetaRequests } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export async function setInstagramBetaStatus(id: string, status: "approved" | "denied" | "pending"): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  await db.update(instagramBetaRequests).set({ status }).where(eq(instagramBetaRequests.id, id));
  revalidatePath("/admin/instagram");
  return { ok: true };
}
