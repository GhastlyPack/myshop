"use client";

import { nanoid } from "nanoid";
import { useSyncExternalStore } from "react";
import type { TrafficSource } from "@/db/schema";

/** Anonymous per-browser id so the funnel (view → click → lead) can be stitched. */
const KEY = "myshop_sid";

export function getSessionId(): string | null {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = nanoid(16);
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

const noopSubscribe = () => () => {};
export function useSessionId() {
  return useSyncExternalStore(noopSubscribe, getSessionId, () => null);
}

/** Current page URL on the client, "" during SSR. */
export function usePageUrl() {
  return useSyncExternalStore(noopSubscribe, () => window.location.href, () => "");
}

/** utm/src from the current URL + referrer hostname. */
export function clientSource(): TrafficSource {
  const out: TrafficSource = {};
  try {
    const p = new URLSearchParams(window.location.search);
    for (const k of ["utm_source", "utm_medium", "utm_campaign", "src"] as const) {
      const v = p.get(k);
      if (v) out[k] = v.slice(0, 100);
    }
    if (document.referrer) {
      const host = new URL(document.referrer).hostname;
      if (host && host !== window.location.hostname) out.referrer = host;
    }
  } catch {}
  return out;
}

export type BeaconType = "view" | "product_view" | "click" | "checkout_start";

export function sendBeacon(payload: { storeId: string; productId?: string | null; type: BeaconType }) {
  try {
    const body = JSON.stringify({ ...payload, sessionId: getSessionId(), source: clientSource() });
    void fetch("/api/track", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
  } catch {}
}
