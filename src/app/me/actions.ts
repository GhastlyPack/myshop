"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { clearBuyerCookie, requestMagicLink } from "@/lib/buyer-session";

export type MagicState = { sent: string } | { error: string } | null;

const emailSchema = z.string().trim().toLowerCase().email().max(200);

export async function requestLinkAction(_prev: MagicState, fd: FormData): Promise<MagicState> {
  const parsed = emailSchema.safeParse(fd.get("email"));
  if (!parsed.success) return { error: "Enter the email you used at checkout." };
  try {
    await requestMagicLink(parsed.data);
  } catch (e) {
    console.error("[magic link]", e);
    return { error: "Couldn't send the link right now. Try again in a minute." };
  }
  return { sent: parsed.data };
}

export async function signOutAction() {
  await clearBuyerCookie();
  redirect("/me");
}
