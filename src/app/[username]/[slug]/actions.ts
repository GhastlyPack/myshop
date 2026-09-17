"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { orders, type CustomField, type TrafficSource } from "@/db/schema";
import { resolvePlan } from "@/lib/billing";
import { bumpPrice, computeTotals, findDiscount, liveAvailability, normalizeCode, resolveBump } from "@/lib/commerce";
import { env } from "@/lib/env";
import { claimFreeProduct } from "@/lib/free-checkout";
import { newId } from "@/lib/ids";
import { startPaidCheckout } from "@/lib/payments/checkout";
import { getPublicProduct } from "@/lib/queries";
import { sourceFromRequest } from "@/lib/track";

export type CheckoutState = { error?: string } | null;

export type ApplyCodeResult = { ok: true; code: string; discountCents: number } | { ok: false; error: string };

/** "Have a code?" → validates a discount code for a paid product and returns what it takes off. */
export async function applyDiscountAction(input: { username: string; slug: string; code: string }): Promise<ApplyCodeResult> {
  const parsed = z.object({ username: z.string().min(1).max(40), slug: z.string().min(1).max(120), code: z.string().max(40) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter a code." };
  const data = await getPublicProduct(parsed.data.username, parsed.data.slug);
  if (!data) return { ok: false, error: "This product is no longer available." };
  if (data.product.priceCents <= 0) return { ok: false, error: "Codes only apply to paid products." };
  const res = await findDiscount(data.product, parsed.data.code);
  if (!res.ok) return res;
  return { ok: true, code: res.code.code, discountCents: res.discountCents };
}

const baseSchema = z.object({
  username: z.string().min(1).max(40),
  slug: z.string().min(1).max(120),
  name: z.string().trim().min(1, "Please enter your name").max(120),
  email: z.string().trim().toLowerCase().email("Please enter a valid email").max(200),
  sessionId: z.string().max(64).optional(),
  pageUrl: z.string().max(2000).optional(),
  code: z.string().max(40).optional(),
});

function readFields(defs: CustomField[], fd: FormData): { values: Record<string, string | string[] | boolean>; error?: string } {
  const values: Record<string, string | string[] | boolean> = {};
  for (const f of defs) {
    const key = `f_${f.id}`;
    if (f.type === "checkbox") {
      const v = fd.get(key) === "on";
      if (f.required && !v) return { values, error: `Please check "${f.label}"` };
      values[f.id] = v;
    } else if (f.type === "multiselect") {
      const v = fd.getAll(key).map(String).filter((s) => (f.options ?? []).includes(s));
      if (f.required && v.length === 0) return { values, error: `Please pick at least one option for "${f.label}"` };
      values[f.id] = v;
    } else {
      const v = String(fd.get(key) ?? "").trim().slice(0, 500);
      if (f.required && !v) return { values, error: `Please fill in "${f.label}"` };
      if (f.type === "select" && v && !(f.options ?? []).includes(v)) return { values, error: `Invalid option for "${f.label}"` };
      values[f.id] = v;
    }
  }
  return { values };
}

export async function checkoutAction(_prev: CheckoutState, fd: FormData): Promise<CheckoutState> {
  const parsed = baseSchema.safeParse({
    username: fd.get("username"),
    slug: fd.get("slug"),
    name: fd.get("name"),
    email: fd.get("email"),
    sessionId: fd.get("sessionId") || undefined,
    pageUrl: fd.get("pageUrl") || undefined,
    code: fd.get("code") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form" };
  const { username, slug, name, email, sessionId, pageUrl } = parsed.data;

  const data = await getPublicProduct(username, slug);
  if (!data) return { error: "This product is no longer available." };
  const { store, product, files, links } = data;

  // Availability is read live (the storefront query is cached) so a sold-out product can't be bought.
  const availability = await liveAvailability(product.id);
  if (availability.soldOut) return { error: "This product is sold out." };

  // Pricing is recomputed here; the client's total is never trusted.
  let discount: { code: string; cents: number } | null = null;
  if (product.priceCents > 0 && parsed.data.code && normalizeCode(parsed.data.code)) {
    const res = await findDiscount(product, parsed.data.code);
    if (!res.ok) return { error: res.error };
    discount = { code: res.code.code, cents: res.discountCents };
  }
  const bumpWanted = fd.get("bump") === "on";
  const bump = bumpWanted && product.priceCents > 0 ? await resolveBump(product) : null;
  const bumpCents = bump ? bumpPrice(bump, product.bumpDiscountPercent) : 0;
  const totals = computeTotals(product.priceCents, discount?.cents ?? 0, bumpCents);

  const fields = readFields(product.fields, fd);
  if (fields.error) return { error: fields.error };
  const marketingOptIn = product.marketingOptIn && fd.get("optIn") === "on";

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
  let source: TrafficSource = {};
  try {
    source = sourceFromRequest(new URL(pageUrl ?? `/${username}/${slug}`, env.APP_BASE_URL), h.get("referer"));
    // The action POSTs from our own page; that's not a traffic source.
    if (source.referrer && source.referrer === new URL(env.APP_BASE_URL).hostname) delete source.referrer;
  } catch {}

  // Free product, or a code that brings the price to $0 (with no bump): claim it outright.
  if (totals.totalCents === 0) {
    const res = await claimFreeProduct({
      store,
      product,
      files,
      links,
      buyerName: name,
      buyerEmail: email,
      customFields: fields.values,
      marketingOptIn,
      source,
      sessionId,
      ip,
      userAgent: h.get("user-agent"),
      pageUrl: pageUrl ?? null,
      discount,
    });
    if (!res.ok) return { error: res.error };
    redirect(`/${store.username}/${product.slug}/thanks?e=${res.token}`);
  }

  // The seller's transaction fee follows their plan: Basic = 5%, Pro/trial = 0%.
  const { feeBps } = await resolvePlan(store);

  // Paid: pending order first so the provider's webhook has something to mark paid.
  const orderId = newId("ord");
  await db.insert(orders).values({
    id: orderId,
    storeId: store.id,
    productId: product.id,
    buyerEmail: email,
    buyerName: name,
    customFields: fields.values,
    marketingOptIn,
    amountCents: totals.totalCents,
    currency: product.currency,
    discountCode: discount?.code ?? null,
    discountCents: totals.discountCents,
    bumpProductId: bump?.id ?? null,
    bumpCents: totals.bumpCents,
    provider: "stripe",
    status: "pending",
    source,
  });
  const res = await startPaidCheckout({
    orderId,
    storeId: store.id,
    productId: product.id,
    amountCents: product.priceCents - totals.discountCents,
    bump: bump ? { productId: bump.id, title: bump.title, amountCents: totals.bumpCents } : null,
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
    return { error: res.error };
  }
  await db.update(orders).set({ provider: res.session.provider, providerRef: res.session.providerRef }).where(eq(orders.id, orderId));
  redirect(res.session.redirectUrl);
}
