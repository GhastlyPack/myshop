"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { bookings, orders, products, stores, users } from "@/db/schema";
import { renderQuestionnaireEmail } from "@/emails/booking";
import { resolvePlan } from "@/lib/billing";
import { confirmBooking } from "@/lib/booking-confirm";
import { getBookingSlots } from "@/lib/booking-slots";
import { env } from "@/lib/env";
import { newId } from "@/lib/ids";
import { sendMail } from "@/lib/mailer";
import { startPaidCheckout } from "@/lib/payments/checkout";
import { getPublicProduct } from "@/lib/queries";
import { formatBookingWhen } from "@/lib/timezone";
import { sourceFromRequest } from "@/lib/track";

const schema = z.object({
  username: z.string().min(1).max(40),
  slug: z.string().min(1).max(120),
  name: z.string().trim().min(1, "Please enter your name").max(120),
  email: z.string().trim().toLowerCase().email("Please enter a valid email").max(200),
  slot: z.string().datetime({ offset: true }),
  timezone: z.string().trim().max(64).optional(),
  marketingOptIn: z.boolean().optional(),
  sessionId: z.string().max(64).optional(),
  pageUrl: z.string().max(2000).optional(),
});

export type BookResult = { ok: false; error: string };

type Answers = Record<string, string | string[] | boolean>;

/**
 * Post-booking questionnaire. Validates against the product's questions, merges the answers
 * into the order (keeping internal keys like __tz), and emails them to the creator.
 * Re-submittable, so a buyer can update their answers from the same page.
 */
export async function submitBookingQuestionnaire(input: { orderId: string; answers: Answers }): Promise<{ ok: true } | { ok: false; error: string }> {
  const orderId = String(input?.orderId ?? "").slice(0, 64);
  if (!orderId) return { ok: false, error: "Missing booking." };
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order || !order.bookingStartAt || order.status !== "paid") return { ok: false, error: "This booking isn't confirmed yet." };
  const [store, product, booking] = await Promise.all([
    db.query.stores.findFirst({ where: eq(stores.id, order.storeId) }),
    db.query.products.findFirst({ where: eq(products.id, order.productId) }),
    db.query.bookings.findFirst({ where: eq(bookings.orderId, orderId) }),
  ]);
  if (!store || !product) return { ok: false, error: "This booking is no longer available." };

  const raw = input.answers ?? {};
  const clean: Answers = {};
  const emailRows: { label: string; value: string }[] = [];
  for (const f of product.fields) {
    const v = raw[f.id];
    if (f.type === "checkbox") {
      const b = v === true;
      if (f.required && !b) return { ok: false, error: `Please check "${f.label}".` };
      clean[f.id] = b;
      emailRows.push({ label: f.label, value: b ? "Yes" : "No" });
    } else if (f.type === "multiselect") {
      const arr = Array.isArray(v) ? v.map(String).filter((s) => (f.options ?? []).includes(s)) : [];
      if (f.required && arr.length === 0) return { ok: false, error: `Please pick at least one option for "${f.label}".` };
      clean[f.id] = arr;
      emailRows.push({ label: f.label, value: arr.join(", ") });
    } else {
      const s = String(v ?? "").trim().slice(0, 2000);
      if (f.required && !s) return { ok: false, error: `Please fill in "${f.label}".` };
      if (f.type === "select" && s && !(f.options ?? []).includes(s)) return { ok: false, error: `Invalid option for "${f.label}".` };
      clean[f.id] = s;
      emailRows.push({ label: f.label, value: s });
    }
  }

  await db.update(orders).set({ customFields: { ...order.customFields, ...clean } }).where(eq(orders.id, orderId));

  // Hand the answers to the creator. Best-effort.
  try {
    const owner = await db.query.users.findFirst({ where: eq(users.id, store.userId), columns: { email: true } });
    if (owner?.email) {
      const start = booking?.startAt ?? order.bookingStartAt;
      const end = booking?.endAt ?? new Date(start.getTime() + (product.durationMinutes ?? 60) * 60_000);
      const mail = await renderQuestionnaireEmail({
        storeName: store.displayName,
        buyerName: order.buyerName,
        buyerEmail: order.buyerEmail,
        productTitle: product.title,
        whenText: formatBookingWhen(start, end, store.booking?.timezone ?? "America/New_York"),
        answers: emailRows,
      });
      await sendMail({ to: owner.email, replyTo: order.buyerEmail, ...mail });
    }
  } catch (e) {
    console.error("[booking] questionnaire email failed", e);
  }
  return { ok: true };
}

/** Book a call: re-check the slot, then confirm (free) or start Stripe checkout (paid). */
export async function bookCall(input: z.input<typeof schema>): Promise<BookResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
  const { username, slug, name, email, timezone, marketingOptIn, pageUrl } = parsed.data;
  const start = new Date(parsed.data.slot);

  const data = await getPublicProduct(username, slug);
  if (!data) return { ok: false, error: "This is no longer available." };
  const { store, product } = data;
  if (product.type !== "booking" || !product.durationMinutes) return { ok: false, error: "This isn't a booking." };

  // Re-check the slot is still open against live calendar + existing bookings.
  const open = await getBookingSlots(store, product);
  if (!open.some((s) => s.getTime() === start.getTime())) return { ok: false, error: "That time was just taken. Please pick another." };

  const h = await headers();
  let source = {};
  try {
    source = sourceFromRequest(new URL(pageUrl ?? `/${username}/${slug}`, env.APP_BASE_URL), h.get("referer"));
  } catch {}

  const orderId = newId("ord");
  const buyerTz = timezone || store.booking?.timezone || "America/New_York";
  const optIn = product.marketingOptIn && Boolean(marketingOptIn);

  // Free call: confirm immediately.
  if (product.priceCents === 0) {
    await db.insert(orders).values({
      id: orderId,
      storeId: store.id,
      productId: product.id,
      buyerEmail: email,
      buyerName: name,
      customFields: { __tz: buyerTz },
      marketingOptIn: optIn,
      amountCents: 0,
      currency: product.currency,
      provider: "free",
      status: "paid",
      bookingStartAt: start,
      source,
    });
    await confirmBooking({ store, product, orderId, buyerName: name, buyerEmail: email, startAt: start, buyerTimezone: buyerTz });
    redirect(`/${store.username}/${product.slug}/thanks?o=${orderId}`);
  }

  // Paid call: pending order carries the slot; the webhook confirms on payment.
  const { feeBps } = await resolvePlan(store);
  await db.insert(orders).values({
    id: orderId,
    storeId: store.id,
    productId: product.id,
    buyerEmail: email,
    buyerName: name,
    customFields: { __tz: buyerTz },
    marketingOptIn: optIn,
    amountCents: product.priceCents,
    currency: product.currency,
    provider: "stripe",
    status: "pending",
    bookingStartAt: start,
    source,
  });
  const res = await startPaidCheckout({
    orderId,
    storeId: store.id,
    productId: product.id,
    amountCents: product.priceCents,
    bump: null,
    currency: product.currency,
    buyerEmail: email,
    buyerName: name,
    title: product.title,
    successUrl: `${env.APP_BASE_URL}/${store.username}/${product.slug}/thanks?o=${orderId}`,
    cancelUrl: `${env.APP_BASE_URL}/${store.username}/${product.slug}`,
    platformFeeBps: feeBps,
  });
  if (!res.ok) {
    await db.update(orders).set({ status: "failed" }).where(eq(orders.id, orderId));
    return { ok: false, error: res.error };
  }
  await db.update(orders).set({ provider: res.session.provider, providerRef: res.session.providerRef }).where(eq(orders.id, orderId));
  redirect(res.session.redirectUrl);
}
