import "server-only";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { events, orders, productFiles, products, stores, users } from "@/db/schema";
import { withDeadline } from "@/lib/watchdog";

const int = (expr: ReturnType<typeof sql>) => sql<number>`(${expr})::int`;

export async function getAdminOverview() {
  const t0 = Date.now();
  const timed = <T,>(label: string, p: Promise<T>) => withDeadline(`admin.${label}`, p).then((r) => { console.log(`[admin] ${label} ${Date.now() - t0}ms`); return r; });

  // Sequential, and all counts in one round trip via scalar subqueries. Fewer, unpipelined
  // queries are gentler on the Supabase transaction pooler (see the pool note in db/index.ts).
  const [counts] = await timed(
    "counts",
    db.execute(sql`
      select
        (select count(*) from ${users})::int as users,
        (select count(*) from ${stores})::int as stores,
        (select count(*) filter (where ${stores.published}) from ${stores})::int as stores_published,
        (select count(*) filter (where ${products.deletedAt} is null) from ${products})::int as products,
        (select count(*) filter (where ${products.status} = 'published' and ${products.deletedAt} is null) from ${products})::int as products_published,
        (select count(*) from ${orders} where ${orders.status} = 'paid')::int as paid_orders,
        (select coalesce(sum(${orders.amountCents}), 0) from ${orders} where ${orders.status} = 'paid')::int as revenue_cents,
        (select coalesce(sum(${productFiles.bytes}), 0) from ${productFiles})::bigint as storage_bytes,
        (select count(*) from ${productFiles})::int as files,
        (select count(*) from ${events} where ${events.createdAt} > now() - interval '24 hours')::int as events_24h
    `),
  );
  const c = counts as Record<string, number | string>;

  const recentSignups = await timed(
    "signups",
    db
      .select({ id: users.id, email: users.email, name: users.name, role: users.role, createdAt: users.createdAt, username: stores.username })
      .from(users)
      .leftJoin(stores, eq(stores.userId, users.id))
      .orderBy(desc(users.createdAt))
      .limit(10),
  );

  const topStores = await timed(
    "topStores",
    db
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
      .limit(10),
  );

  return {
    users: Number(c.users ?? 0),
    stores: Number(c.stores ?? 0),
    storesPublished: Number(c.stores_published ?? 0),
    products: Number(c.products ?? 0),
    productsPublished: Number(c.products_published ?? 0),
    paidOrders: Number(c.paid_orders ?? 0),
    revenueCents: Number(c.revenue_cents ?? 0),
    storageBytes: Number(c.storage_bytes ?? 0),
    files: Number(c.files ?? 0),
    events24h: Number(c.events_24h ?? 0),
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
