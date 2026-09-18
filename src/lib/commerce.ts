import "server-only";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { discountCodes, orders, products, type BumpConfig, type DiscountCode, type Product } from "@/db/schema";
import { revalidateStore } from "@/lib/queries";

/**
 * Commerce rules shared by the storefront checkout, the free claim, the Stripe
 * webhook and the payments test script: discount codes, limited quantity and
 * order bumps. Pure helpers are exported so the pricing math is testable
 * without a request context; the DB helpers always read live rows (never the
 * cached storefront query) because availability changes with every sale.
 */

/** Stripe's minimum charge. Anything between 1¢ and this can't be checked out. */
export const MIN_CHARGE_CENTS = 50;

// ---------- discount codes ----------

export function normalizeCode(raw: string) {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/** Cents taken off `priceCents` by a code. Never more than the price itself. */
export function discountAmount(priceCents: number, dc: Pick<DiscountCode, "percentOff" | "amountOffCents">) {
  if (priceCents <= 0) return 0;
  const off = dc.percentOff != null ? Math.round((priceCents * dc.percentOff) / 100) : (dc.amountOffCents ?? 0);
  return Math.max(0, Math.min(priceCents, off));
}

export type DiscountCheck = { ok: true; code: DiscountCode; discountCents: number } | { ok: false; error: string };

/** Validates a code against a product and a moment in time; usable from a script. */
export function checkDiscount(product: Pick<Product, "priceCents">, dc: DiscountCode | null | undefined, now = new Date()): DiscountCheck {
  if (!dc || !dc.active) return { ok: false, error: "That code isn't valid." };
  if (dc.expiresAt && dc.expiresAt.getTime() <= now.getTime()) return { ok: false, error: "That code has expired." };
  if (dc.maxUses != null && dc.uses >= dc.maxUses) return { ok: false, error: "That code has been fully redeemed." };
  if (product.priceCents <= 0) return { ok: false, error: "Codes only apply to paid products." };
  const discountCents = discountAmount(product.priceCents, dc);
  const after = product.priceCents - discountCents;
  if (after > 0 && after < MIN_CHARGE_CENTS) return { ok: false, error: "That code can't be applied to this price." };
  return { ok: true, code: dc, discountCents };
}

/** Live lookup + validation of a code for a product. */
export async function findDiscount(product: Pick<Product, "id" | "priceCents">, rawCode: string): Promise<DiscountCheck> {
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, error: "Enter a code." };
  const dc = await db.query.discountCodes.findFirst({ where: and(eq(discountCodes.productId, product.id), eq(discountCodes.code, code)) });
  return checkDiscount(product, dc);
}

// ---------- limited quantity ----------

/** Units left, or null when unlimited. Never negative even if a race oversold. */
export function remainingUnits(p: Pick<Product, "quantityLimit" | "quantitySold">): number | null {
  if (p.quantityLimit == null) return null;
  return Math.max(0, p.quantityLimit - p.quantitySold);
}

export function isSoldOut(p: Pick<Product, "quantityLimit" | "quantitySold">) {
  return remainingUnits(p) === 0;
}

/** "Only N left" threshold for storefront badges. */
export const LOW_STOCK_AT = 10;

/** Fresh read of the columns the checkout action needs to refuse a sold-out product. */
export async function liveAvailability(productId: string) {
  const row = await db.query.products.findFirst({
    where: and(eq(products.id, productId), isNull(products.deletedAt)),
    columns: { quantityLimit: true, quantitySold: true },
  });
  if (!row) return { soldOut: true as const, remaining: 0 };
  return { soldOut: isSoldOut(row), remaining: remainingUnits(row) };
}

// ---------- order bumps ----------

/** Price of the bump after the creator's optional % off. */
export function bumpPrice(bump: Pick<Product, "priceCents">, percentOff: number) {
  const pct = Math.min(100, Math.max(0, Math.round(percentOff || 0)));
  return Math.max(0, bump.priceCents - Math.round((bump.priceCents * pct) / 100));
}

export function defaultBumpHeadline(title: string, priceLabel: string) {
  return `Add ${title} for ${priceLabel}`;
}

/** A bump can only be offered on a card-payable product and only for one. */
export function canOfferBump(p: Pick<Product, "priceCents">) {
  return p.priceCents >= MIN_CHARGE_CENTS;
}

/**
 * Live resolution of a product's bump: same store, paid, published, not archived,
 * not sold out. Returns null when any of that stopped being true since the creator set it.
 */
export async function resolveBump(p: Pick<Product, "id" | "storeId" | "priceCents" | "bumpProductId" | "bumpDiscountPercent">): Promise<Product | null> {
  if (!p.bumpProductId || p.bumpProductId === p.id || !canOfferBump(p)) return null;
  const bump = await db.query.products.findFirst({
    where: and(eq(products.id, p.bumpProductId), eq(products.storeId, p.storeId), eq(products.status, "published"), isNull(products.deletedAt)),
  });
  if (!bump || bump.priceCents <= 0 || bump.type === "link" || isSoldOut(bump)) return null;
  return bump;
}

// ---------- multiple order bumps ----------

/**
 * The configured bumps on a product, newest model first: the `bumps` list wins; a product
 * that only ever set the legacy single-bump columns is read as a one-item list.
 */
export function productBumpConfigs(p: Pick<Product, "bumps" | "bumpProductId" | "bumpHeadline" | "bumpDiscountPercent">): BumpConfig[] {
  if (p.bumps && p.bumps.length > 0) return p.bumps;
  if (p.bumpProductId) return [{ productId: p.bumpProductId, headline: p.bumpHeadline ?? "", discountPercent: p.bumpDiscountPercent }];
  return [];
}

export type ResolvedBump = { config: BumpConfig; product: Product; cents: number };

/** Live resolution of every bump on a product; ones that stopped being offerable are dropped. */
export async function resolveBumps(p: Pick<Product, "id" | "storeId" | "priceCents" | "bumps" | "bumpProductId" | "bumpHeadline" | "bumpDiscountPercent">): Promise<ResolvedBump[]> {
  if (!canOfferBump(p)) return [];
  const configs = productBumpConfigs(p).filter((c) => c.productId && c.productId !== p.id);
  if (configs.length === 0) return [];
  const rows = await db.query.products.findMany({
    where: and(inArray(products.id, configs.map((c) => c.productId)), eq(products.storeId, p.storeId), eq(products.status, "published"), isNull(products.deletedAt)),
  });
  const out: ResolvedBump[] = [];
  const seen = new Set<string>();
  for (const c of configs) {
    if (seen.has(c.productId)) continue;
    const bump = rows.find((r) => r.id === c.productId);
    if (!bump || bump.priceCents <= 0 || bump.type === "link" || isSoldOut(bump)) continue;
    seen.add(c.productId);
    out.push({ config: c, product: bump, cents: bumpPrice(bump, c.discountPercent ?? 0) });
  }
  return out;
}

// ---------- pay what you want ----------

/**
 * Validates a buyer-entered amount for a pay-what-you-want product. Anything from the floor up;
 * a non-zero amount must clear Stripe's minimum.
 */
export function checkPwywAmount(p: Pick<Product, "payWhatYouWant" | "minPriceCents">, amountCents: number): { ok: true; cents: number } | { ok: false; error: string } {
  if (!p.payWhatYouWant) return { ok: false, error: "This product has a fixed price." };
  if (!Number.isInteger(amountCents) || amountCents < 0) return { ok: false, error: "Enter an amount." };
  if (amountCents < p.minPriceCents) return { ok: false, error: `The minimum is ${(p.minPriceCents / 100).toFixed(2)}.` };
  if (amountCents > 0 && amountCents < MIN_CHARGE_CENTS) return { ok: false, error: `Amounts under ${(MIN_CHARGE_CENTS / 100).toFixed(2)} can't be charged. Enter 0 to get it free.` };
  return { ok: true, cents: amountCents };
}

// ---------- totals ----------

export type Totals = { priceCents: number; discountCents: number; bumpCents: number; totalCents: number };

/** What the buyer pays: price − discount + bumps (a single number or the sum of a list). */
export function computeTotals(priceCents: number, discountCents: number, bumpCents: number | number[]): Totals {
  const d = Math.max(0, Math.min(priceCents, discountCents));
  const b = Math.max(0, Array.isArray(bumpCents) ? bumpCents.reduce((s, c) => s + Math.max(0, c), 0) : bumpCents);
  return { priceCents, discountCents: d, bumpCents: b, totalCents: Math.max(0, priceCents - d + b) };
}

// ---------- after payment ----------

/**
 * Bookkeeping once an order is paid (free claim immediately, Stripe from the webhook):
 * bumps `quantity_sold` on the product (and the bump product), and counts the discount use.
 *
 * Quantity is never reserved ahead of payment. If two buyers race past the last unit the
 * webhook still marks both paid (they were charged), `quantity_sold` goes over the limit,
 * and the storefront shows sold out from then on. The discount counter, on the other hand,
 * never passes `max_uses`: the increment is guarded in SQL.
 */
export async function recordSale(
  order: Pick<typeof orders.$inferSelect, "id" | "productId" | "bumpProductId" | "discountCode"> & { bumps?: { productId: string }[] | null },
  storeUsername?: string | null,
) {
  // Every bump on the order counts as a unit sold; fall back to the legacy single column.
  const bumpIds = order.bumps && order.bumps.length > 0 ? [...new Set(order.bumps.map((b) => b.productId))] : order.bumpProductId ? [order.bumpProductId] : [];
  await db.transaction(async (tx) => {
    await tx
      .update(products)
      .set({ quantitySold: sql`${products.quantitySold} + 1` })
      .where(eq(products.id, order.productId));
    for (const bumpId of bumpIds) {
      await tx
        .update(products)
        .set({ quantitySold: sql`${products.quantitySold} + 1` })
        .where(eq(products.id, bumpId));
    }
    if (order.discountCode) {
      await tx
        .update(discountCodes)
        .set({ uses: sql`${discountCodes.uses} + 1` })
        .where(
          and(
            eq(discountCodes.productId, order.productId),
            eq(discountCodes.code, order.discountCode),
            sql`(${discountCodes.maxUses} is null or ${discountCodes.uses} < ${discountCodes.maxUses})`,
          ),
        );
    }
  });
  // The storefront query is cached by store tag; a sale can flip "Only N left" / "Sold out".
  if (storeUsername) {
    try {
      revalidateStore(storeUsername);
    } catch {
      // Outside a Next request scope (test script) revalidation has nothing to do.
    }
  }
}
