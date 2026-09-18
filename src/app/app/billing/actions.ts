"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { upgradeToPro } from "@/lib/billing";

/** Switch the current subscription up to Pro (keeps any remaining trial; 5% off if upgrading mid-trial). */
export async function upgradeToProAction(interval: "month" | "year"): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  const safeInterval = interval === "year" ? "year" : "month";
  const res = await upgradeToPro(user, safeInterval);
  if (res.ok) {
    revalidatePath("/app/billing");
    revalidatePath("/app");
  }
  return res;
}
