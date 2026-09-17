import { requireStore } from "@/lib/auth";
import { csvResponse, paged } from "@/lib/payments/csv";
import { listOrders, parseStatus } from "@/lib/payments/reports";

export const dynamic = "force-dynamic";

/** Streams every order for the signed-in creator's store as CSV. Optional ?status= filter. */
export async function GET(req: Request) {
  const { store } = await requireStore();
  const status = parseStatus(new URL(req.url).searchParams.get("status"));

  const rows = paged((offset, limit) => listOrders(store.id, { status, offset, limit }));
  async function* cells() {
    for await (const o of rows) {
      yield [
        o.id,
        o.createdAt,
        o.productTitle,
        o.productSlug,
        o.buyerName,
        o.buyerEmail,
        (o.amountCents / 100).toFixed(2),
        o.currency.toUpperCase(),
        (o.platformFeeCents / 100).toFixed(2),
        o.discountCode ?? "",
        (o.discountCents / 100).toFixed(2),
        o.bumpProductTitle ?? "",
        (o.bumpCents / 100).toFixed(2),
        o.provider,
        o.providerRef ?? "",
        o.status,
        o.marketingOptIn ? "yes" : "no",
      ];
    }
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return csvResponse(
    `${store.username}-orders-${stamp}.csv`,
    [
      "order_id",
      "date",
      "product",
      "product_slug",
      "buyer_name",
      "buyer_email",
      "amount",
      "currency",
      "platform_fee",
      "discount_code",
      "discount",
      "bump_product",
      "bump_amount",
      "provider",
      "provider_ref",
      "status",
      "marketing_opt_in",
    ],
    cells(),
  );
}
