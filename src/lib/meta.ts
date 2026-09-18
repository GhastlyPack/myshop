import "server-only";
import { createHash } from "node:crypto";
import type { StorePixels } from "@/db/schema";
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
  /** Target a specific pixel + token (a creator's own). Defaults to the platform's env pixel. */
  pixelId?: string;
  accessToken?: string;
};

/** A pixel + Conversions API token to send server-side events to. */
export type CapiTarget = { pixelId: string; token: string };

/**
 * Every Meta CAPI target for a sale: the platform's (from env, if configured) plus the
 * creator's own when they've added a pixel *and* a CAPI token. Deduped by pixel id.
 */
export function capiTargets(storePixels?: StorePixels | null): CapiTarget[] {
  const targets: CapiTarget[] = [];
  if (env.META_PIXEL_ID && env.META_CAPI_TOKEN) targets.push({ pixelId: env.META_PIXEL_ID, token: env.META_CAPI_TOKEN });
  const meta = storePixels?.meta;
  if (meta?.pixelId && meta.capiToken && !targets.some((t) => t.pixelId === meta.pixelId)) {
    targets.push({ pixelId: meta.pixelId, token: meta.capiToken });
  }
  return targets;
}

export type CapiResult =
  | { skipped: true; reason: string }
  | { skipped: false; ok: true; eventsReceived: number; fbtraceId?: string; raw: unknown }
  | { skipped: false; ok: false; status?: number; error: unknown };

export const metaConfigured = Boolean(env.META_PIXEL_ID && env.META_CAPI_TOKEN);

export function hashEmail(email: string) {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

export async function sendCapiEvent(input: CapiEventInput): Promise<CapiResult> {
  const pixelId = input.pixelId ?? env.META_PIXEL_ID;
  const accessToken = input.accessToken ?? env.META_CAPI_TOKEN;
  if (!pixelId || !accessToken) return { skipped: true, reason: "no Meta pixel id / CAPI token" };

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
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`, {
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

/** Fire one event to every target (platform + the creator's own), each deduped with its browser pixel by event id. */
function sendToTargets(base: CapiEventInput, targets?: CapiTarget[]): Promise<CapiResult[]> {
  // No explicit targets → the platform env pixel (back-compat).
  if (!targets) return Promise.all([sendCapiEvent(base)]);
  return Promise.all(targets.map((t) => sendCapiEvent({ ...base, pixelId: t.pixelId, accessToken: t.token })));
}

/** Free product claimed. Call from the free-checkout action after the order is created. */
export function capiLead(ctx: Ctx, data: { productId: string; productName: string; currency?: string }, targets?: CapiTarget[]) {
  return sendToTargets(
    { ...ctx, eventName: "Lead", customData: { content_ids: [data.productId], content_name: data.productName, content_type: "product", currency: data.currency ?? "usd", value: 0 } },
    targets,
  );
}

/** Paid order confirmed. Call from the Stripe webhook (checkout.session.completed). */
export function capiPurchase(
  ctx: Ctx,
  data: { productId: string; productName: string; amountCents: number; currency: string; orderId: string },
  targets?: CapiTarget[],
) {
  return sendToTargets(
    {
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
    },
    targets,
  );
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
