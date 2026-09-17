import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/db";
import { instagramAccounts, instagramReplies, products, stores, type InstagramAccount, type Product } from "@/db/schema";
import { env, instagramConfigured } from "@/lib/env";
import { newId } from "@/lib/ids";

/**
 * Instagram API with Instagram Login.
 *   connect  → https://www.instagram.com/oauth/authorize (business scopes)
 *   callback → short-lived token → long-lived token (60d) → profile → subscribe to webhooks
 *   webhook  → comment/message with a product's DM keyword → private reply with the product link
 * Tokens are AES-256-GCM encrypted at rest with SESSION_SECRET.
 */
const GRAPH = "https://graph.instagram.com/v21.0";
export const IG_SCOPES = ["instagram_business_basic", "instagram_business_manage_comments", "instagram_business_manage_messages"];

// ---------- crypto ----------
const key = createHash("sha256").update(env.SESSION_SECRET).digest();
export function encrypt(plain: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return `${iv.toString("base64url")}.${c.getAuthTag().toString("base64url")}.${enc.toString("base64url")}`;
}
export function decrypt(blob: string) {
  const [iv, tag, data] = blob.split(".").map((s) => Buffer.from(s, "base64url"));
  const d = createDecipheriv("aes-256-gcm", key, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(data), d.final()]).toString("utf8");
}

// ---------- OAuth ----------
const stateSecret = new TextEncoder().encode(env.SESSION_SECRET);
export const redirectUri = () => `${env.APP_BASE_URL}/api/instagram/callback`;

export async function signState(storeId: string) {
  return new SignJWT({ storeId, p: "ig" }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("15m").sign(stateSecret);
}
export async function verifyState(state: string): Promise<{ storeId: string } | null> {
  try {
    const { payload } = await jwtVerify(state, stateSecret);
    return payload.p === "ig" && typeof payload.storeId === "string" ? { storeId: payload.storeId } : null;
  } catch {
    return null;
  }
}

export function authorizeUrl(state: string) {
  const u = new URL("https://www.instagram.com/oauth/authorize");
  u.searchParams.set("client_id", env.INSTAGRAM_APP_ID!);
  u.searchParams.set("redirect_uri", redirectUri());
  u.searchParams.set("scope", IG_SCOPES.join(","));
  u.searchParams.set("response_type", "code");
  u.searchParams.set("state", state);
  return u.toString();
}

async function graph<T>(path: string, init: RequestInit & { token?: string; query?: Record<string, string> } = {}): Promise<T> {
  const u = new URL(path.startsWith("http") ? path : `${GRAPH}${path}`);
  for (const [k, v] of Object.entries(init.query ?? {})) u.searchParams.set(k, v);
  if (init.token) u.searchParams.set("access_token", init.token);
  const res = await fetch(u, { ...init, headers: { "Content-Type": "application/json", ...(init.headers ?? {}) } });
  const json = (await res.json().catch(() => ({}))) as T & { error?: { message?: string; code?: number } };
  if (!res.ok || json?.error) throw new Error(`Instagram ${u.pathname}: ${json?.error?.message ?? res.status}`);
  return json;
}

/** Code → long-lived token + profile. */
export async function exchangeCode(code: string) {
  const form = new URLSearchParams({
    client_id: env.INSTAGRAM_APP_ID!,
    client_secret: env.INSTAGRAM_APP_SECRET!,
    grant_type: "authorization_code",
    redirect_uri: redirectUri(),
    code,
  });
  const short = (await (await fetch("https://api.instagram.com/oauth/access_token", { method: "POST", body: form })).json()) as {
    access_token?: string;
    user_id?: string;
    error_message?: string;
  };
  if (!short.access_token) throw new Error(`Instagram token exchange failed: ${short.error_message ?? "no token"}`);
  const long = await graph<{ access_token: string; expires_in: number }>("https://graph.instagram.com/access_token", {
    query: { grant_type: "ig_exchange_token", client_secret: env.INSTAGRAM_APP_SECRET!, access_token: short.access_token },
  });
  const me = await graph<{ id: string; user_id?: string; username: string }>("/me", { token: long.access_token, query: { fields: "id,user_id,username" } });
  return { token: long.access_token, expiresIn: long.expires_in, igUserId: me.user_id ?? me.id, username: me.username };
}

/** Required for Instagram-Login apps: subscribe this account to our app's webhook fields. */
export async function subscribeWebhooks(igUserId: string, token: string) {
  await graph(`/${igUserId}/subscribed_apps`, { method: "POST", token, query: { subscribed_fields: "comments,messages" } });
}

/** Refresh a long-lived token (valid if older than 24h and not expired). Returns the new expiry. */
export async function refreshIfNeeded(acct: InstagramAccount): Promise<string> {
  const token = decrypt(acct.tokenEnc);
  const daysLeft = (acct.tokenExpiresAt.getTime() - Date.now()) / 86_400_000;
  if (daysLeft > 7) return token;
  try {
    const r = await graph<{ access_token: string; expires_in: number }>("https://graph.instagram.com/refresh_access_token", {
      query: { grant_type: "ig_refresh_token", access_token: token },
    });
    await db
      .update(instagramAccounts)
      .set({ tokenEnc: encrypt(r.access_token), tokenExpiresAt: new Date(Date.now() + r.expires_in * 1000) })
      .where(eq(instagramAccounts.id, acct.id));
    return r.access_token;
  } catch (e) {
    console.error("[instagram] refresh failed", e);
    return token;
  }
}

// ---------- sending ----------
export async function privateReplyToComment(igUserId: string, token: string, commentId: string, text: string) {
  await graph(`/${igUserId}/messages`, { method: "POST", token, body: JSON.stringify({ recipient: { comment_id: commentId }, message: { text } }) });
}
export async function sendDm(igUserId: string, token: string, recipientId: string, text: string) {
  await graph(`/${igUserId}/messages`, { method: "POST", token, body: JSON.stringify({ recipient: { id: recipientId }, message: { text } }) });
}
export async function publicReplyToComment(token: string, commentId: string, text: string) {
  await graph(`/${commentId}/replies`, { method: "POST", token, query: { message: text } });
}

// ---------- webhook ----------
export function verifySignature(rawBody: string, header: string | null) {
  if (!header?.startsWith("sha256=") || !env.INSTAGRAM_APP_SECRET) return false;
  const expected = createHmac("sha256", env.INSTAGRAM_APP_SECRET).update(rawBody).digest("hex");
  const got = header.slice(7);
  return got.length === expected.length && timingSafeEqual(Buffer.from(got, "hex"), Buffer.from(expected, "hex"));
}

/** Match a comment/DM against a store's product keywords: whole word, case-insensitive. Longest keyword wins. */
export function matchKeyword(text: string, candidates: Pick<Product, "id" | "dmKeyword">[]) {
  const t = ` ${text.toLowerCase().replace(/[^\p{L}\p{N}\s#]+/gu, " ")} `;
  let best: { product: Pick<Product, "id" | "dmKeyword">; kw: string } | null = null;
  for (const p of candidates) {
    const kw = p.dmKeyword?.trim().toLowerCase();
    if (!kw) continue;
    if (t.includes(` ${kw} `) || t.includes(` #${kw} `)) {
      if (!best || kw.length > best.kw.length) best = { product: p, kw };
    }
  }
  return best;
}

type CommentChange = { field: "comments"; value: { id: string; text?: string; from?: { id: string; username?: string }; media?: { id: string } } };
type MessagingEvent = { sender?: { id: string }; recipient?: { id: string }; message?: { mid?: string; text?: string; is_echo?: boolean } };
export type WebhookBody = { object?: string; entry?: { id: string; changes?: CommentChange[]; messaging?: MessagingEvent[] }[] };

export function replyText(product: Pick<Product, "title" | "slug" | "dmReplyText">, username: string, recipient?: string | null) {
  const link = `${env.APP_BASE_URL}/${username}/${product.slug}?src=ig`;
  const custom = product.dmReplyText?.trim();
  if (!custom) return `Here's ${product.title}: ${link}`;
  const out = custom.replace(/\{\{\s*link\s*\}\}/gi, link).replace(/\{\{\s*title\s*\}\}/gi, product.title).replace(/\{\{\s*name\s*\}\}/gi, recipient ? `@${recipient}` : "there");
  return out.includes(link) ? out : `${out}\n${link}`; // never send a reply without the link
}

/** Process one webhook payload. Never throws; every attempt is logged in instagram_replies. */
export async function handleWebhook(body: WebhookBody) {
  if (!instagramConfigured) return { handled: 0 };
  let handled = 0;
  for (const entry of body.entry ?? []) {
    const acct = await db.query.instagramAccounts.findFirst({ where: and(eq(instagramAccounts.igUserId, entry.id), eq(instagramAccounts.active, true)) });
    if (!acct) continue;
    const store = await db.query.stores.findFirst({ where: eq(stores.id, acct.storeId) });
    if (!store || !store.published) continue;
    const candidates = await db
      .select({ id: products.id, dmKeyword: products.dmKeyword, title: products.title, slug: products.slug, dmReplyText: products.dmReplyText })
      .from(products)
      .where(and(eq(products.storeId, store.id), eq(products.status, "published"), isNull(products.deletedAt)));
    const token = await refreshIfNeeded(acct);

    for (const ch of entry.changes ?? []) {
      if (ch.field !== "comments" || !ch.value?.text || !ch.value.id) continue;
      if (ch.value.from?.id === acct.igUserId) continue; // our own comment
      const m = matchKeyword(ch.value.text, candidates);
      if (!m) continue;
      const product = candidates.find((p) => p.id === m.product.id)!;
      handled += await sendOnce({
        acct,
        store,
        product,
        kind: "comment",
        sourceId: ch.value.id,
        from: ch.value.from,
        keyword: m.kw,
        send: async () => {
          await privateReplyToComment(acct.igUserId, token, ch.value.id, replyText(product, store.username, ch.value.from?.username));
          if (acct.publicReply) await publicReplyToComment(token, ch.value.id, "Sent you a DM!").catch(() => {});
        },
      });
    }
    for (const ev of entry.messaging ?? []) {
      const text = ev.message?.text;
      const mid = ev.message?.mid;
      if (!text || !mid || ev.message?.is_echo || !ev.sender?.id || ev.sender.id === acct.igUserId) continue;
      const m = matchKeyword(text, candidates);
      if (!m) continue;
      const product = candidates.find((p) => p.id === m.product.id)!;
      handled += await sendOnce({
        acct,
        store,
        product,
        kind: "dm",
        sourceId: mid,
        from: { id: ev.sender.id },
        keyword: m.kw,
        send: () => sendDm(acct.igUserId, token, ev.sender!.id!, replyText(product, store.username, null)),
      });
    }
  }
  return { handled };
}

async function sendOnce(a: {
  acct: InstagramAccount;
  store: { id: string };
  product: { id: string };
  kind: "comment" | "dm";
  sourceId: string;
  from?: { id: string; username?: string };
  keyword: string;
  send: () => Promise<void>;
}) {
  // Idempotency: Meta retries; a unique index on source_id makes the second attempt a no-op.
  const inserted = await db
    .insert(instagramReplies)
    .values({ id: newId("igr"), storeId: a.store.id, productId: a.product.id, kind: a.kind, sourceId: a.sourceId, fromIgUserId: a.from?.id ?? null, fromUsername: a.from?.username ?? null, keyword: a.keyword, ok: false })
    .onConflictDoNothing()
    .returning({ id: instagramReplies.id });
  if (inserted.length === 0) return 0;
  try {
    await a.send();
    await db.update(instagramReplies).set({ ok: true }).where(eq(instagramReplies.id, inserted[0].id));
    return 1;
  } catch (e) {
    await db.update(instagramReplies).set({ ok: false, error: String((e as Error).message).slice(0, 500) }).where(eq(instagramReplies.id, inserted[0].id));
    console.error("[instagram] reply failed", e);
    return 0;
  }
}

/**
 * Meta's `signed_request` (deauthorize + data-deletion callbacks):
 * base64url(hmac_sha256(payload)).base64url(json). Returns the payload or null.
 */
export function parseSignedRequest(sr: string | null): { user_id?: string } | null {
  if (!sr || !env.INSTAGRAM_APP_SECRET) return null;
  const [sig, payload] = sr.split(".");
  if (!sig || !payload) return null;
  const expected = createHmac("sha256", env.INSTAGRAM_APP_SECRET).update(payload).digest();
  const got = Buffer.from(sig, "base64url");
  if (got.length !== expected.length || !timingSafeEqual(got, expected)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}
