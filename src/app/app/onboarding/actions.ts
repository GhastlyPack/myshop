"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { stores } from "@/db/schema";
import { getCurrentStore, requireUser } from "@/lib/auth";
import { newId } from "@/lib/ids";
import { revalidateStore } from "@/lib/queries";
import { normalizeUsername, usernameError } from "@/lib/reserved";

export type UsernameCheck = { username: string; available: boolean; error: string | null };

/** Live availability check used by the onboarding form (debounced on the client). */
export async function checkUsername(raw: string): Promise<UsernameCheck> {
  await requireUser();
  const username = normalizeUsername(String(raw ?? ""));
  const err = usernameError(username);
  if (err) return { username, available: false, error: err };
  const taken = await db.query.stores.findFirst({ where: eq(stores.username, username), columns: { id: true } });
  if (taken) return { username, available: false, error: "That username is taken." };
  return { username, available: true, error: null };
}

const createSchema = z.object({
  username: z.string().min(1).max(40),
  displayName: z.string().trim().min(1, "Add a display name.").max(80, "Keep it under 80 characters."),
  bio: z.string().trim().max(300, "Keep your bio under 300 characters.").default(""),
});

export type CreateStoreResult = { ok: true } | { ok: false; errors: Record<string, string> };

export async function createStore(input: z.input<typeof createSchema>): Promise<CreateStoreResult> {
  const user = await requireUser();
  if (await getCurrentStore()) return { ok: true };

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) errors[String(issue.path[0] ?? "form")] = issue.message;
    return { ok: false, errors };
  }
  const username = normalizeUsername(parsed.data.username);
  const uErr = usernameError(username);
  if (uErr) return { ok: false, errors: { username: uErr } };

  try {
    await db.insert(stores).values({
      id: newId("sto"),
      userId: user.id,
      username,
      displayName: parsed.data.displayName,
      bio: parsed.data.bio || null,
      theme: {},
    });
  } catch {
    // unique index on username or user_id
    return { ok: false, errors: { username: "That username is taken." } };
  }
  revalidateStore(username);
  return { ok: true };
}

/** Called after createStore once the avatar bytes are uploaded (the ticket API needs a store to exist). */
export async function setOnboardingAvatar(key: string): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const store = await db.query.stores.findFirst({ where: eq(stores.userId, user.id) });
  if (!store) return { ok: false };
  if (typeof key !== "string" || !key.startsWith(`${store.id}/avatar/`)) return { ok: false };
  await db.update(stores).set({ avatarKey: key }).where(eq(stores.id, store.id));
  revalidateStore(store.username);
  return { ok: true };
}

export async function finishOnboarding() {
  redirect("/app");
}
