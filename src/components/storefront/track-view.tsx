"use client";

import { useEffect } from "react";
import { sendBeacon, type BeaconType } from "./session";

const sent = new Set<string>();

/** Fires one analytics beacon per page load (dedupes React strict-mode double effects). */
export function TrackView({ storeId, productId, type }: { storeId: string; productId?: string | null; type: BeaconType }) {
  useEffect(() => {
    const key = `${type}:${storeId}:${productId ?? ""}:${window.location.pathname}`;
    if (sent.has(key)) return;
    sent.add(key);
    sendBeacon({ storeId, productId, type });
  }, [storeId, productId, type]);
  return null;
}
