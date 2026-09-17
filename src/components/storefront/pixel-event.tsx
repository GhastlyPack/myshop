"use client";

import { useEffect } from "react";
import { trackPixel } from "@/components/meta-pixel";

const fired = new Set<string>();

/**
 * Fires one Meta Pixel event on mount. Pass the same `eventId` the server uses
 * for CAPI (order id for Lead/Purchase) so Meta dedupes browser + server.
 */
export function PixelEvent({ event, params, eventId }: { event: string; params?: Record<string, unknown>; eventId?: string }) {
  useEffect(() => {
    const key = `${event}:${eventId ?? window.location.pathname}`;
    if (fired.has(key)) return;
    fired.add(key);
    trackPixel(event, params, eventId);
  }, [event, eventId, params]);
  return null;
}
