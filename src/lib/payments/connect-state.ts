import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";

/** Signed OAuth `state` for Stripe Connect: binds the callback to a store, 10-minute TTL. */
const secret = new TextEncoder().encode(env.SESSION_SECRET);
const SUBJECT = "stripe-connect";

export async function signConnectState(storeId: string) {
  return new SignJWT({ storeId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(SUBJECT)
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(secret);
}

export async function verifyConnectState(state: string): Promise<{ storeId: string } | null> {
  try {
    const { payload } = await jwtVerify(state, secret, { subject: SUBJECT });
    const storeId = payload.storeId;
    return typeof storeId === "string" && storeId ? { storeId } : null;
  } catch {
    return null;
  }
}
