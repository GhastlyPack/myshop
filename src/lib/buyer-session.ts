import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/db";
import { buyerSessions } from "@/db/schema";
import { renderMagicLinkEmail } from "@/emails/magic-link";
import { env } from "@/lib/env";
import { newId, newToken } from "@/lib/ids";
import { sendMail } from "@/lib/mailer";

/**
 * Buyer auth for /me. Buyers never create accounts: they request a magic link,
 * clicking it mints a 30-day signed cookie keyed to their email.
 */
export const BUYER_COOKIE = "myshop_buyer";
const MAGIC_TTL_MS = 15 * 60 * 1000;
const SESSION_DAYS = 30;
const secret = new TextEncoder().encode(env.SESSION_SECRET);

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/** Create a one-time magic link and email it. Always resolves (no email enumeration). */
export async function requestMagicLink(emailRaw: string) {
  const email = normalizeEmail(emailRaw);
  const token = newToken();
  await db.insert(buyerSessions).values({
    id: newId("bs"),
    email,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + MAGIC_TTL_MS),
  });
  const url = `${env.APP_BASE_URL}/me/verify?t=${token}`;
  const { subject, html, text } = await renderMagicLinkEmail({ url, email });
  await sendMail({ to: email, subject, html, text });
}

/** Consume a magic-link token. Returns the email or null. */
export async function consumeMagicLink(token: string): Promise<string | null> {
  if (!token || token.length > 80) return null;
  const tokenHash = hashToken(token);
  const [row] = await db
    .update(buyerSessions)
    .set({ consumed: true })
    .where(and(eq(buyerSessions.tokenHash, tokenHash), eq(buyerSessions.consumed, false), gt(buyerSessions.expiresAt, new Date())))
    .returning({ email: buyerSessions.email });
  return row?.email ?? null;
}

/** Signed cookie value for a buyer email. */
export async function mintBuyerCookie(email: string) {
  const value = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(normalizeEmail(email))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret);
  return {
    name: BUYER_COOKIE,
    value,
    options: { httpOnly: true, sameSite: "lax" as const, secure: env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * SESSION_DAYS },
  };
}

/** Email of the signed-in buyer, or null. */
export async function getBuyerEmail(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(BUYER_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload.sub ? String(payload.sub) : null;
  } catch {
    return null;
  }
}

export async function clearBuyerCookie() {
  const jar = await cookies();
  jar.delete(BUYER_COOKIE);
}
