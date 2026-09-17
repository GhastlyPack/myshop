import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { instagramBetaRequests, type InstagramBetaRequest } from "@/db/schema";
import { instagramPublic } from "@/lib/env";

export type BetaState =
  | { access: "open" } // App Review passed: anyone can connect
  | { access: "approved" } // added as a Meta tester
  | { access: "pending"; username: string }
  | { access: "denied" }
  | { access: "none" }; // no application yet

/** Whether this store may run the live connect flow, and what to show if not. */
export async function instagramBetaState(storeId: string): Promise<BetaState> {
  if (instagramPublic) return { access: "open" };
  const req = await db.query.instagramBetaRequests.findFirst({ where: eq(instagramBetaRequests.storeId, storeId) });
  if (!req) return { access: "none" };
  if (req.status === "approved") return { access: "approved" };
  if (req.status === "denied") return { access: "denied" };
  return { access: "pending", username: req.igUsername };
}

export function canConnectInstagram(state: BetaState) {
  return state.access === "open" || state.access === "approved";
}

export async function listBetaRequests(): Promise<InstagramBetaRequest[]> {
  return db.select().from(instagramBetaRequests).orderBy(instagramBetaRequests.createdAt);
}
