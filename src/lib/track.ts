import "server-only";
import { db } from "@/db";
import { events, type TrafficSource } from "@/db/schema";
import { newId } from "@/lib/ids";

export type EventType = (typeof events.type.enumValues)[number];

/**
 * First-party analytics. Fire-and-forget; never let analytics break a request.
 * Meta Pixel (client) + CAPI (server) hang off the same call sites in M6.
 */
export async function track(input: {
  storeId: string;
  productId?: string | null;
  type: EventType;
  sessionId?: string | null;
  source?: TrafficSource;
}) {
  try {
    await db.insert(events).values({
      id: newId("evt"),
      storeId: input.storeId,
      productId: input.productId ?? null,
      type: input.type,
      sessionId: input.sessionId ?? null,
      source: input.source ?? {},
    });
  } catch (e) {
    console.error("[track] failed", e);
  }
}

/** Pull utm/src/referrer out of a request URL + headers. */
export function sourceFromRequest(url: URL, referrer?: string | null): TrafficSource {
  const p = url.searchParams;
  const src: TrafficSource = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "src"] as const) {
    const v = p.get(k);
    if (v) src[k] = v.slice(0, 100);
  }
  if (referrer) {
    try {
      src.referrer = new URL(referrer).hostname;
    } catch {}
  }
  return src;
}
