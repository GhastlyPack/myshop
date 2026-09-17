import "server-only";
import { db } from "@/db";
import { entitlements, orders, type Product, type ProductFile, type ProductLink, type Store, type TrafficSource } from "@/db/schema";
import { renderDeliveryEmailProducts } from "@/emails/delivery";
import { recordSale } from "@/lib/commerce";
import { env } from "@/lib/env";
import { newId, newToken } from "@/lib/ids";
import { sendMail } from "@/lib/mailer";
import { capiLead } from "@/lib/meta";
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
  userAgent?: string | null;
  /** Absolute product page URL, used as the CAPI event source. */
  pageUrl?: string | null;
  /** A validated discount code that brings a paid product to $0 (then it's claimed like a free one). */
  discount?: { code: string; cents: number } | null;
};

export type ClaimResult = { ok: true; token: string } | { ok: false; error: string };

export async function claimFreeProduct(input: ClaimInput): Promise<ClaimResult> {
  const { store, product } = input;
  const discountCents = input.discount?.cents ?? 0;
  if (product.priceCents - discountCents !== 0) return { ok: false, error: "This product isn't free." };
  if (product.quantityLimit != null && product.quantitySold >= product.quantityLimit) return { ok: false, error: "This product is sold out." };
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
      discountCode: input.discount?.code ?? null,
      discountCents,
      provider: "free",
      status: "paid",
      source: input.source,
    });
    await tx.insert(entitlements).values({ id: newId("ent"), orderId, productId: product.id, buyerEmail: email, token });
  });
  await recordSale({ id: orderId, productId: product.id, bumpProductId: null, discountCode: input.discount?.code ?? null }, store.username);

  await sendDeliveryEmail({ store, product, files: input.files, links: input.links, buyerName: input.buyerName, buyerEmail: email, token, isPaid: false });
  await track({ storeId: store.id, productId: product.id, type: "lead", sessionId: input.sessionId, source: input.source });
  // Server-side Meta Lead; the thanks page fires the browser Lead with the same order id so Meta dedupes.
  void capiLead(
    { eventId: orderId, eventSourceUrl: input.pageUrl ?? `${env.APP_BASE_URL}/${store.username}/${product.slug}`, email, ip: input.ip ?? undefined, userAgent: input.userAgent ?? undefined },
    { productId: product.id, productName: product.title, currency: product.currency },
  );
  return { ok: true, token };
}

export type DeliveryItem = { product: Product; files: ProductFile[]; links: ProductLink[]; token: string };

/**
 * One email for every product on the order (main first, then the bump). The first
 * product's confirmation subject/body is used. Never throws.
 */
export async function sendDeliveryEmailProducts(p: { store: Store; items: DeliveryItem[]; buyerName: string; buyerEmail: string; isPaid: boolean }) {
  const main = p.items[0];
  if (!main) return;
  try {
    const mail = await renderDeliveryEmailProducts({
      storeName: p.store.displayName,
      storeUsername: p.store.username,
      buyerName: p.buyerName,
      buyerEmail: p.buyerEmail,
      products: p.items.map((it) => ({
        title: it.product.title,
        token: it.token,
        files: it.files.map((f) => ({ id: f.id, filename: f.filename })),
        links: it.links.map((l) => ({ url: l.url, label: l.label })),
      })),
      baseUrl: env.APP_BASE_URL,
      confirmationSubject: main.product.confirmationSubject,
      confirmationBody: main.product.confirmationBody,
      isPaid: p.isPaid,
    });
    await sendMail({ to: p.buyerEmail, ...mail });
  } catch (e) {
    console.error("[delivery email] failed", e);
  }
}

/** Single-product wrapper shared by the free flow and (via Package D) the paid webhook. Never throws. */
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
  return sendDeliveryEmailProducts({
    store: p.store,
    items: [{ product: p.product, files: p.files, links: p.links, token: p.token }],
    buyerName: p.buyerName,
    buyerEmail: p.buyerEmail,
    isPaid: p.isPaid,
  });
}
