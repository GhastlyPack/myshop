import "server-only";
import { createHash } from "node:crypto";
import { env } from "@/lib/env";

/**
 * Meta Conversions API (server side). Pairs with `src/components/meta-pixel.tsx`
 * on the client: fire the same `eventId` from both and Meta dedupes.
 *
 * No-op when META_PIXEL_ID / META_CAPI_TOKEN are unset. Never throws.
 */

const GRAPH_VERSION = "v21.0";

export type CapiEventName = "PageView" | "ViewContent" | "Lead" | "Purchase" | "InitiateCheckout" | (string & {});

export type CapiEventInput = {
  eventName: CapiEventName;
  eventId: string;
  eventSourceUrl: string;
  email?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  /** _fbp / _fbc cookies when available (improves match quality). */
  fbp?: string | null;
  fbc?: string | null;
  customData?: Record<string, unknown>;
  /** Unix seconds; defaults to now. */
  eventTime?: number;
  /** Set to a Meta test event code while verifying in Events Manager. */
  testEventCode?: string;
};

export type CapiResult =
  | { skipped: true; reason: string }
  | { skipped: false; ok: true; eventsReceived: number; fbtraceId?: string; raw: unknown }
  | { skipped: false; ok: false; status?: number; error: unknown };

export const metaConfigured = Boolean(env.META_PIXEL_ID && env.META_CAPI_TOKEN);

export function hashEmail(email: string) {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

export async function sendCapiEvent(input: CapiEventInput): Promise<CapiResult> {
  if (!env.META_PIXEL_ID || !env.META_CAPI_TOKEN) return { skipped: true, reason: "META_PIXEL_ID / META_CAPI_TOKEN not set" };

  const userData: Record<string, unknown> = {};
  if (input.email) userData.em = [hashEmail(input.email)];
  if (input.ip) userData.client_ip_address = input.ip;
  if (input.userAgent) userData.client_user_agent = input.userAgent;
  if (input.fbp) userData.fbp = input.fbp;
  if (input.fbc) userData.fbc = input.fbc;

  const body: Record<string, unknown> = {
    data: [
      {
        event_name: input.eventName,
        event_time: input.eventTime ?? Math.floor(Date.now() / 1000),
        event_id: input.eventId,
        event_source_url: input.eventSourceUrl,
        action_source: "website",
        user_data: userData,
        ...(input.customData ? { custom_data: input.customData } : {}),
      },
    ],
  };
  if (input.testEventCode) body.test_event_code = input.testEventCode;

  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${env.META_PIXEL_ID}/events?access_token=${encodeURIComponent(env.META_CAPI_TOKEN)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    const json: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      console.error("[meta] CAPI error", res.status, json);
      return { skipped: false, ok: false, status: res.status, error: json };
    }
    const r = (json ?? {}) as { events_received?: number; fbtrace_id?: string };
    return { skipped: false, ok: true, eventsReceived: r.events_received ?? 0, fbtraceId: r.fbtrace_id, raw: json };
  } catch (e) {
    console.error("[meta] CAPI failed", e);
    return { skipped: false, ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

type Ctx = Pick<CapiEventInput, "eventId" | "eventSourceUrl" | "email" | "ip" | "userAgent" | "fbp" | "fbc">;

/** Free product claimed. Call from the free-checkout action after the order is created. */
export function capiLead(ctx: Ctx, data: { productId: string; productName: string; currency?: string }) {
  return sendCapiEvent({
    ...ctx,
    eventName: "Lead",
    customData: { content_ids: [data.productId], content_name: data.productName, content_type: "product", currency: data.currency ?? "usd", value: 0 },
  });
}

/** Paid order confirmed. Call from the Stripe webhook (checkout.session.completed). */
export function capiPurchase(ctx: Ctx, data: { productId: string; productName: string; amountCents: number; currency: string; orderId: string }) {
  return sendCapiEvent({
    ...ctx,
    eventName: "Purchase",
    customData: {
      content_ids: [data.productId],
      content_name: data.productName,
      content_type: "product",
      currency: data.currency.toLowerCase(),
      value: data.amountCents / 100,
      order_id: data.orderId,
      num_items: 1,
    },
  });
}

/** Product page viewed. Call from the product page's server render / track route. */
export function capiViewContent(ctx: Ctx, data: { productId: string; productName: string; priceCents: number; currency: string }) {
  return sendCapiEvent({
    ...ctx,
    eventName: "ViewContent",
    customData: {
      content_ids: [data.productId],
      content_name: data.productName,
      content_type: "product",
      currency: data.currency.toLowerCase(),
      value: data.priceCents / 100,
    },
  });
}
