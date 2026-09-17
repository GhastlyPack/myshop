"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { adminInvites, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { newId } from "@/lib/ids";

type Result = { ok: true } | { ok: false; error: string };
const emailSchema = z.string().trim().email("Enter a valid email.").max(200);

/** Owner or admin: grant admin to an email. Existing user → role admin now; otherwise applied on their first sign-in. */
export async function addAdmin(raw: string): Promise<Result> {
  await requireAdmin();
  const parsed = emailSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid email." };
  const email = parsed.data.toLowerCase();
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) {
    if (existing.role === "owner" || existing.role === "admin") return { ok: false, error: "Already an admin." };
    await db.update(users).set({ role: "admin" }).where(eq(users.id, existing.id));
  } else {
    const me = await requireAdmin();
    await db.insert(adminInvites).values({ id: newId("inv"), email, invitedBy: me.id }).onConflictDoNothing();
  }
  revalidatePath("/admin/team");
  return { ok: true };
}

/** Owner only: remove an admin (demote to creator) or cancel a pending invite. The owner can't be removed. */
export async function removeAdmin(email: string): Promise<Result> {
  const me = await requireAdmin();
  if (me.role !== "owner") return { ok: false, error: "Only the owner can remove admins." };
  const target = email.trim().toLowerCase();
  if (target === me.email) return { ok: false, error: "The owner can't be removed." };
  await db.update(users).set({ role: "creator" }).where(and(eq(users.email, target), ne(users.role, "owner")));
  await db.delete(adminInvites).where(eq(adminInvites.email, target));
  revalidatePath("/admin/team");
  return { ok: true };
}
