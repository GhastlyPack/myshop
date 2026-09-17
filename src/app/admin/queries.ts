import "server-only";
import { and, desc, eq, gte, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { events, orders, productFiles, products, stores, users } from "@/db/schema";
import { withDeadline } from "@/lib/watchdog";

const int = (expr: ReturnType<typeof sql>) => sql<number>`(${expr})::int`;

export async function getAdminOverview() {
  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000);
  const t0 = Date.now();
  const timed = <T,>(label: string, p: Promise<T>) => withDeadline(`admin.${label}`, p).then((r) => { console.log(`[admin] ${label} ${Date.now() - t0}ms`); return r; });
  const [[u], [s], [p], [o], [f], [e], recentSignups, topStores] = await Promise.all([
    timed("users", db.select({ n: int(sql`count(*)`) }).from(users)),
    timed("stores", db.select({ n: int(sql`count(*)`), published: int(sql`count(*) filter (where ${stores.published})`) }).from(stores)),
    timed("products", db.select({ n: int(sql`count(*) filter (where ${products.deletedAt} is null)`), published: int(sql`count(*) filter (where ${products.status} = 'published' and ${products.deletedAt} is null)`) }).from(products)),
    timed("orders", db
      .select({ n: int(sql`count(*)`), revenueCents: int(sql`coalesce(sum(${orders.amountCents}), 0)`) })
      .from(orders)
      .where(eq(orders.status, "paid"))),
    timed("files", db.select({ bytes: sql<number>`coalesce(sum(${productFiles.bytes}), 0)::bigint`, n: int(sql`count(*)`) }).from(productFiles)),
    timed("events", db
      .select({ n: int(sql`count(*)`) })
      .from(events)
      .where(gte(events.createdAt, dayAgo))),
    timed("signups", db
      .select({ id: users.id, email: users.email, name: users.name, role: users.role, createdAt: users.createdAt, username: stores.username })
      .from(users)
      .leftJoin(stores, eq(stores.userId, users.id))
      .orderBy(desc(users.createdAt))
      .limit(10)),
    timed("topStores", db
      .select({
        id: stores.id,
        username: stores.username,
        displayName: stores.displayName,
        orders: int(sql`count(${orders.id})`),
        revenueCents: int(sql`coalesce(sum(${orders.amountCents}), 0)`),
      })
      .from(stores)
      .innerJoin(orders, and(eq(orders.storeId, stores.id), eq(orders.status, "paid")))
      .groupBy(stores.id, stores.username, stores.displayName)
      .orderBy(desc(sql`count(${orders.id})`), desc(sql`sum(${orders.amountCents})`))
      .limit(10)),
  ]);

  return {
    users: u?.n ?? 0,
    stores: s?.n ?? 0,
    storesPublished: s?.published ?? 0,
    products: p?.n ?? 0,
    productsPublished: p?.published ?? 0,
    paidOrders: o?.n ?? 0,
    revenueCents: o?.revenueCents ?? 0,
    storageBytes: Number(f?.bytes ?? 0),
    files: f?.n ?? 0,
    events24h: e?.n ?? 0,
    recentSignups,
    topStores,
  };
}

export async function listStores(q: string) {
  const term = q.trim();
  const productCount = db
    .select({ storeId: products.storeId, productCount: sql<number>`count(*) filter (where ${products.deletedAt} is null)::int`.as("product_count") })
    .from(products)
    .groupBy(products.storeId)
    .as("pc");
  const orderCount = db
    .select({ storeId: orders.storeId, orderCount: sql<number>`count(*) filter (where ${orders.status} = 'paid')::int`.as("order_count") })
    .from(orders)
    .groupBy(orders.storeId)
    .as("oc");

  return db
    .select({
      id: stores.id,
      username: stores.username,
      displayName: stores.displayName,
      published: stores.published,
      createdAt: stores.createdAt,
      ownerEmail: users.email,
      products: sql<number>`coalesce(${productCount.productCount}, 0)::int`,
      orders: sql<number>`coalesce(${orderCount.orderCount}, 0)::int`,
    })
    .from(stores)
    .innerJoin(users, eq(users.id, stores.userId))
    .leftJoin(productCount, eq(productCount.storeId, stores.id))
    .leftJoin(orderCount, eq(orderCount.storeId, stores.id))
    .where(term ? or(ilike(stores.username, `%${term}%`), ilike(stores.displayName, `%${term}%`), ilike(users.email, `%${term}%`)) : undefined)
    .orderBy(desc(stores.createdAt))
    .limit(200);
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`;
}
