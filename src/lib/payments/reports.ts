import "server-only";
import { and, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { orders, products } from "@/db/schema";

/** Second join on products for the order bump. */
const bumpProducts = alias(products, "bump_products");

/**
 * Read models for /app/income and /app/customers (+ their CSV exports).
 * Every query is scoped by storeId; callers get it from requireStore().
 */
export type OrderStatus = (typeof orders.status.enumValues)[number];
export const ORDER_STATUSES = orders.status.enumValues;

export type IncomeSummary = {
  gross30Cents: number;
  allTimeCents: number;
  ordersCount: number;
  refundsCount: number;
  refundsCents: number;
};

export async function incomeSummary(storeId: string): Promise<IncomeSummary> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const paid = sql`${orders.status} = 'paid'`;
  const refunded = sql`${orders.status} = 'refunded'`;
  const [row] = await db
    .select({
      gross30Cents: sql<number>`coalesce(sum(case when ${paid} and ${orders.createdAt} >= ${since}::timestamptz then ${orders.amountCents} else 0 end), 0)`.mapWith(Number),
      allTimeCents: sql<number>`coalesce(sum(case when ${paid} then ${orders.amountCents} else 0 end), 0)`.mapWith(Number),
      ordersCount: sql<number>`count(*) filter (where ${paid} or ${refunded})`.mapWith(Number),
      refundsCount: sql<number>`count(*) filter (where ${refunded})`.mapWith(Number),
      refundsCents: sql<number>`coalesce(sum(case when ${refunded} then ${orders.amountCents} else 0 end), 0)`.mapWith(Number),
    })
    .from(orders)
    .where(eq(orders.storeId, storeId));
  return row ?? { gross30Cents: 0, allTimeCents: 0, ordersCount: 0, refundsCount: 0, refundsCents: 0 };
}

export type OrderRow = {
  id: string;
  createdAt: Date;
  productId: string;
  productTitle: string;
  productSlug: string;
  buyerEmail: string;
  buyerName: string;
  amountCents: number;
  currency: string;
  platformFeeCents: number;
  provider: (typeof orders.provider.enumValues)[number];
  providerRef: string | null;
  status: OrderStatus;
  marketingOptIn: boolean;
  discountCode: string | null;
  discountCents: number;
  bumpProductTitle: string | null;
  bumpCents: number;
};

export async function listOrders(
  storeId: string,
  opts: { status?: OrderStatus | null; offset?: number; limit?: number } = {},
): Promise<OrderRow[]> {
  const conds: SQL[] = [eq(orders.storeId, storeId)];
  if (opts.status) conds.push(eq(orders.status, opts.status));
  return db
    .select({
      id: orders.id,
      createdAt: orders.createdAt,
      productId: orders.productId,
      productTitle: products.title,
      productSlug: products.slug,
      buyerEmail: orders.buyerEmail,
      buyerName: orders.buyerName,
      amountCents: orders.amountCents,
      currency: orders.currency,
      platformFeeCents: orders.platformFeeCents,
      provider: orders.provider,
      providerRef: orders.providerRef,
      status: orders.status,
      marketingOptIn: orders.marketingOptIn,
      discountCode: orders.discountCode,
      discountCents: orders.discountCents,
      bumpProductTitle: bumpProducts.title,
      bumpCents: orders.bumpCents,
    })
    .from(orders)
    .innerJoin(products, eq(products.id, orders.productId))
    .leftJoin(bumpProducts, eq(bumpProducts.id, orders.bumpProductId))
    .where(and(...conds))
    .orderBy(desc(orders.createdAt), desc(orders.id))
    .limit(opts.limit ?? 200)
    .offset(opts.offset ?? 0);
}

export type CustomerRow = {
  email: string;
  name: string;
  firstSeen: Date;
  lastSeen: Date;
  ordersCount: number;
  totalSpentCents: number;
  marketingOptIn: boolean;
  products: string[];
};

/** Unique buyers: one row per email across completed (paid/refunded) orders. */
export async function listCustomers(
  storeId: string,
  opts: { q?: string | null; optInOnly?: boolean; offset?: number; limit?: number } = {},
): Promise<CustomerRow[]> {
  const conds: SQL[] = [eq(orders.storeId, storeId), inArray(orders.status, ["paid", "refunded"])];
  const q = opts.q?.trim();
  if (q) {
    const pat = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
    conds.push(or(ilike(orders.buyerEmail, pat), ilike(orders.buyerName, pat)) as SQL);
  }
  const optIn = sql<boolean>`bool_or(${orders.marketingOptIn})`;
  const lastSeen = sql`max(${orders.createdAt})`;
  return db
    .select({
      email: orders.buyerEmail,
      // Most recent non-empty name the buyer typed.
      name: sql<string>`coalesce((array_agg(${orders.buyerName} order by ${orders.createdAt} desc) filter (where ${orders.buyerName} <> ''))[1], '')`,
      firstSeen: sql`min(${orders.createdAt})`.mapWith(orders.createdAt),
      lastSeen: lastSeen.mapWith(orders.createdAt),
      ordersCount: sql<number>`count(*)`.mapWith(Number),
      totalSpentCents: sql<number>`coalesce(sum(case when ${orders.status} = 'paid' then ${orders.amountCents} else 0 end), 0)`.mapWith(Number),
      marketingOptIn: optIn,
      products: sql<string[]>`array_agg(distinct ${products.title})`,
    })
    .from(orders)
    .innerJoin(products, eq(products.id, orders.productId))
    .where(and(...conds))
    .groupBy(orders.buyerEmail)
    .having(opts.optInOnly ? optIn : undefined)
    .orderBy(desc(lastSeen))
    .limit(opts.limit ?? 200)
    .offset(opts.offset ?? 0);
}

export async function countCustomers(storeId: string): Promise<{ total: number; optIns: number }> {
  const [row] = await db
    .select({
      total: sql<number>`count(distinct ${orders.buyerEmail})`.mapWith(Number),
      optIns: sql<number>`count(distinct ${orders.buyerEmail}) filter (where ${orders.marketingOptIn})`.mapWith(Number),
    })
    .from(orders)
    .where(and(eq(orders.storeId, storeId), inArray(orders.status, ["paid", "refunded"])));
  return row ?? { total: 0, optIns: 0 };
}

export function parseStatus(raw: string | undefined | null): OrderStatus | null {
  return raw && (ORDER_STATUSES as readonly string[]).includes(raw) ? (raw as OrderStatus) : null;
}
