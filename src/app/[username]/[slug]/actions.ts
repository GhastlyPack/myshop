"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { orders, type CustomField, type TrafficSource } from "@/db/schema";
import { env } from "@/lib/env";
import { claimFreeProduct } from "@/lib/free-checkout";
import { newId } from "@/lib/ids";
import { startPaidCheckout } from "@/lib/payments/checkout";
import { getPublicProduct } from "@/lib/queries";
import { sourceFromRequest } from "@/lib/track";

export type CheckoutState = { error?: string } | null;

const baseSchema = z.object({
  username: z.string().min(1).max(40),
  slug: z.string().min(1).max(120),
  name: z.string().trim().min(1, "Please enter your name").max(120),
  email: z.string().trim().toLowerCase().email("Please enter a valid email").max(200),
  sessionId: z.string().max(64).optional(),
  pageUrl: z.string().max(2000).optional(),
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
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form" };
  const { username, slug, name, email, sessionId, pageUrl } = parsed.data;

  const data = await getPublicProduct(username, slug);
  if (!data) return { error: "This product is no longer available." };
  const { store, product, files, links } = data;

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

  if (product.priceCents === 0) {
    const res = await claimFreeProduct({ store, product, files, links, buyerName: name, buyerEmail: email, customFields: fields.values, marketingOptIn, source, sessionId, ip });
    if (!res.ok) return { error: res.error };
    redirect(`/${store.username}/${product.slug}/thanks?e=${res.token}`);
  }

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
    amountCents: product.priceCents,
    currency: product.currency,
    provider: "stripe",
    status: "pending",
    source,
  });
  const res = await startPaidCheckout({
    orderId,
    storeId: store.id,
    productId: product.id,
    amountCents: product.priceCents,
    currency: product.currency,
    buyerEmail: email,
    buyerName: name,
    title: product.title,
    successUrl: `${env.APP_BASE_URL}/${store.username}/${product.slug}/thanks?o=${orderId}`,
    cancelUrl: `${env.APP_BASE_URL}/${store.username}/${product.slug}`,
    platformFeeBps: store.platformFeeBps,
  });
  if (!res.ok) {
    await db.update(orders).set({ status: "failed" }).where(eq(orders.id, orderId));
    return { error: res.error };
  }
  await db.update(orders).set({ provider: res.session.provider, providerRef: res.session.providerRef }).where(eq(orders.id, orderId));
  redirect(res.session.redirectUrl);
}
