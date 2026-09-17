"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { requireStore } from "@/lib/auth";
import { stripeConfigured } from "@/lib/env";
import { getStripeAccount } from "@/lib/payments/checkout";
import { refundOrder } from "@/lib/payments/stripe";
import { markOrderRefunded } from "@/lib/payments/webhook";

function back(params: Record<string, string>): never {
  const u = new URLSearchParams(params);
  redirect(`/app/income?${u.toString()}`);
}

/**
 * Full refund of a paid Stripe order, issued on the creator's connected
 * account. We flip the order optimistically once Stripe accepts the refund;
 * the `charge.refunded` webhook is idempotent and lands on the same state.
 */
export async function refundOrderAction(formData: FormData) {
  const { store } = await requireStore();
  const orderId = String(formData.get("orderId") ?? "");
  const status = String(formData.get("status") ?? "");

  const order = await db.query.orders.findFirst({ where: and(eq(orders.id, orderId), eq(orders.storeId, store.id)) });
  if (!order) back({ status, error: "Order not found." });
  if (order.status !== "paid") back({ status, error: "Only paid orders can be refunded." });
  if (order.provider !== "stripe" || !order.providerRef) back({ status, error: "Free orders have nothing to refund." });
  if (!stripeConfigured) back({ status, error: "Stripe isn't configured on this deployment." });

  const acct = await getStripeAccount(store.id);
  if (!acct) back({ status, error: "Connect Stripe in Settings before refunding." });

  let failure: string | null = null;
  try {
    await refundOrder(order, acct.externalId);
    await markOrderRefunded(order.id);
  } catch (e) {
    console.error("[income] refund failed", order.id, e);
    failure = e instanceof Error ? e.message : "Refund failed.";
  }
  revalidatePath("/app/income");
  revalidatePath("/app/customers");
  if (failure) back({ status, error: `Refund failed: ${failure.slice(0, 160)}` });
  back({ status, msg: `Refunded ${order.buyerEmail}. The buyer's download link is now disabled.` });
}
