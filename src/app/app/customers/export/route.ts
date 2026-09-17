import { requireStore } from "@/lib/auth";
import { csvResponse, paged } from "@/lib/payments/csv";
import { listCustomers } from "@/lib/payments/reports";

export const dynamic = "force-dynamic";

/**
 * Streams the store's unique buyers as CSV. `?optin=1` restricts to buyers who
 * ticked the marketing checkbox on at least one order (safe to import into an
 * email tool).
 */
export async function GET(req: Request) {
  const { store } = await requireStore();
  const optInOnly = new URL(req.url).searchParams.get("optin") === "1";

  const rows = paged((offset, limit) => listCustomers(store.id, { optInOnly, offset, limit }));
  async function* cells() {
    for await (const c of rows) {
      yield [
        c.email,
        c.name,
        c.firstSeen,
        c.lastSeen,
        c.ordersCount,
        (c.totalSpentCents / 100).toFixed(2),
        store.currency.toUpperCase(),
        c.marketingOptIn ? "yes" : "no",
        c.products,
      ];
    }
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return csvResponse(
    `${store.username}-${optInOnly ? "marketing-optins" : "customers"}-${stamp}.csv`,
    ["email", "name", "first_seen", "last_seen", "orders", "total_spent", "currency", "marketing_opt_in", "products"],
    cells(),
  );
}
