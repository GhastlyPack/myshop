"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";

/**
 * Meta Pixel (client). Rendered on every public storefront page by Package B:
 *   <MetaPixel pixelId={env.META_PIXEL_ID} />
 * Renders nothing when no pixel id is configured. Fires PageView on mount and on
 * every client-side navigation. Server-side CAPI lives in `src/lib/meta.ts`;
 * pass the same `eventID` to both so Meta dedupes.
 */

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue?: unknown[]; loaded?: boolean; version?: string };

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

export function newEventId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Fire a standard/custom pixel event. Safe no-op if the pixel is not loaded. Returns the eventID used. */
export function trackPixel(event: string, params?: Record<string, unknown>, eventId = newEventId()) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return eventId;
  const standard = new Set(["PageView", "ViewContent", "Lead", "Purchase", "InitiateCheckout", "AddToCart", "CompleteRegistration", "Contact", "Subscribe"]);
  window.fbq(standard.has(event) ? "track" : "trackCustom", event, params ?? {}, { eventID: eventId });
  return eventId;
}

export function MetaPixel({ pixelId }: { pixelId?: string | null }) {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pixelId || !pathname) return;
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    // The inline snippet is injected afterInteractive, so on first mount fbq may
    // not exist yet. Poll briefly rather than drop the first PageView.
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (typeof window.fbq === "function") {
        clearInterval(timer);
        trackPixel("PageView");
      } else if (tries > 60) {
        clearInterval(timer);
      }
    }, 50);
    return () => clearInterval(timer);
  }, [pixelId, pathname]);

  if (!pixelId) return null;

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${pixelId.replace(/[^0-9]/g, "")}');`}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img height="1" width="1" style={{ display: "none" }} alt="" src={`https://www.facebook.com/tr?id=${encodeURIComponent(pixelId)}&ev=PageView&noscript=1`} />
      </noscript>
    </>
  );
}
