import "server-only";
import { db } from "@/db";
import { entitlements, orders, type Product, type ProductFile, type ProductLink, type Store, type TrafficSource } from "@/db/schema";
import { renderDeliveryEmail } from "@/emails/delivery";
import { env } from "@/lib/env";
import { newId, newToken } from "@/lib/ids";
import { sendMail } from "@/lib/mailer";
import { track } from "@/lib/track";

/**
 * Free product claim: order(free, paid, $0) + entitlement + delivery email + `lead` event.
 * Rate-limited in memory per ip+email (good enough for one lambda; Upstash later).
 */
const WINDOW_MS = 60_000;
const LIMIT = 10;
const hits = new Map<string, number[]>();

export function rateLimited(key: string, now = Date.now()) {
  const arr = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= LIMIT) {
    hits.set(key, arr);
    return true;
  }
  arr.push(now);
  hits.set(key, arr);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
  }
  return false;
}

export type ClaimInput = {
  store: Store;
  product: Product;
  files: ProductFile[];
  links: ProductLink[];
  buyerName: string;
  buyerEmail: string;
  customFields: Record<string, string | string[] | boolean>;
  marketingOptIn: boolean;
  source: TrafficSource;
  sessionId?: string | null;
  ip?: string | null;
};

export type ClaimResult = { ok: true; token: string } | { ok: false; error: string };

export async function claimFreeProduct(input: ClaimInput): Promise<ClaimResult> {
  const { store, product } = input;
  if (product.priceCents !== 0) return { ok: false, error: "This product isn't free." };
  const email = input.buyerEmail.trim().toLowerCase();
  if (rateLimited(`${input.ip ?? "?"}|${email}`)) return { ok: false, error: "Too many requests. Try again in a minute." };

  const orderId = newId("ord");
  const token = newToken();
  await db.transaction(async (tx) => {
    await tx.insert(orders).values({
      id: orderId,
      storeId: store.id,
      productId: product.id,
      buyerEmail: email,
      buyerName: input.buyerName.trim(),
      customFields: input.customFields,
      marketingOptIn: input.marketingOptIn,
      amountCents: 0,
      currency: product.currency,
      provider: "free",
      status: "paid",
      source: input.source,
    });
    await tx.insert(entitlements).values({ id: newId("ent"), orderId, productId: product.id, buyerEmail: email, token });
  });

  await sendDeliveryEmail({ store, product, files: input.files, links: input.links, buyerName: input.buyerName, buyerEmail: email, token, isPaid: false });
  await track({ storeId: store.id, productId: product.id, type: "lead", sessionId: input.sessionId, source: input.source });
  return { ok: true, token };
}

/** Shared by the free flow and (via Package D) the paid webhook. Never throws. */
export async function sendDeliveryEmail(p: {
  store: Store;
  product: Product;
  files: ProductFile[];
  links: ProductLink[];
  buyerName: string;
  buyerEmail: string;
  token: string;
  isPaid: boolean;
}) {
  try {
    const mail = await renderDeliveryEmail({
      storeName: p.store.displayName,
      storeUsername: p.store.username,
      productTitle: p.product.title,
      buyerName: p.buyerName,
      buyerEmail: p.buyerEmail,
      token: p.token,
      files: p.files.map((f) => ({ id: f.id, filename: f.filename })),
      links: p.links.map((l) => ({ url: l.url, label: l.label })),
      baseUrl: env.APP_BASE_URL,
      confirmationSubject: p.product.confirmationSubject,
      confirmationBody: p.product.confirmationBody,
      isPaid: p.isPaid,
    });
    await sendMail({ to: p.buyerEmail, ...mail });
  } catch (e) {
    console.error("[delivery email] failed", e);
  }
}
