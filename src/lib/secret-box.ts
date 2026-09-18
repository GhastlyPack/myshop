import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "@/lib/env";

/**
 * Small symmetric encrypt/decrypt for tokens stored at rest (OAuth refresh tokens, etc.).
 * AES-256-GCM keyed off SESSION_SECRET. Format: iv.tag.ciphertext, all base64url.
 */
const key = createHash("sha256").update(env.SESSION_SECRET).digest();

export function seal(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return `${iv.toString("base64url")}.${c.getAuthTag().toString("base64url")}.${enc.toString("base64url")}`;
}

export function open(blob: string): string {
  const [iv, tag, data] = blob.split(".").map((s) => Buffer.from(s, "base64url"));
  const d = createDecipheriv("aes-256-gcm", key, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(data), d.final()]).toString("utf8");
}
