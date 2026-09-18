"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import type { PixelEventName, ResolvedPixels } from "@/lib/pixels";

/**
 * Loads a creator's own ad pixels (Meta, Google, TikTok) on their storefront and fires
 * page views on navigation, so their campaigns can optimize and retarget on their traffic.
 * The platform's own Meta pixel (if configured) rides along in `metaIds`. Event dispatch
 * for ViewContent / InitiateCheckout / Lead / Purchase is done by {@link fireStorePixel}.
 */

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue?: unknown[]; loaded?: boolean; version?: string };
type Gtag = (...args: unknown[]) => void;
type Ttq = { track: (event: string, params?: Record<string, unknown>) => void; page: () => void; load?: (id: string) => void; [k: string]: unknown };

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
    gtag?: Gtag;
    ttq?: Ttq;
  }
}

const canonicalToGoogle: Record<PixelEventName, string> = {
  ViewContent: "view_item",
  InitiateCheckout: "begin_checkout",
  Lead: "generate_lead",
  Purchase: "purchase",
};
const canonicalToTiktok: Record<PixelEventName, string> = {
  ViewContent: "ViewContent",
  InitiateCheckout: "InitiateCheckout",
  Lead: "SubmitForm",
  Purchase: "CompletePayment",
};

export type PixelEventData = {
  contentIds: string[];
  contentName?: string;
  value?: number;
  currency?: string;
};

/** Fire one canonical event to whichever of the creator's pixels are configured. Safe no-op if a pixel didn't load. */
export function fireStorePixel(pixels: ResolvedPixels, event: PixelEventName, data: PixelEventData, eventId?: string) {
  if (typeof window === "undefined") return;
  const currency = (data.currency ?? "usd").toUpperCase();
  const value = data.value ?? 0;

  // Meta — a plain track reaches every initialized pixel (platform + creator).
  if (pixels.metaIds.length && typeof window.fbq === "function") {
    window.fbq(
      "track",
      event,
      { content_ids: data.contentIds, content_name: data.contentName, content_type: "product", currency, value },
      eventId ? { eventID: eventId } : undefined,
    );
  }
  // Google (gtag / GA4 + Google Ads).
  if (pixels.googleTagId && typeof window.gtag === "function") {
    window.gtag("event", canonicalToGoogle[event], {
      currency,
      value,
      ...(event === "Purchase" && eventId ? { transaction_id: eventId } : {}),
      items: data.contentIds.map((id) => ({ item_id: id, item_name: data.contentName, price: value })),
    });
  }
  // TikTok.
  if (pixels.tiktokPixelId && window.ttq && typeof window.ttq.track === "function") {
    window.ttq.track(canonicalToTiktok[event], {
      value,
      currency,
      contents: data.contentIds.map((id) => ({ content_id: id, content_type: "product", content_name: data.contentName })),
    });
  }
}

export function StorePixels({ pixels }: { pixels: ResolvedPixels }) {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  // Page views on client-side navigation (initial view fires from each provider's init snippet).
  useEffect(() => {
    if (!pathname || lastPath.current === pathname) return;
    const first = lastPath.current === null;
    lastPath.current = pathname;
    if (first) return; // the init snippets already sent the first page view
    if (pixels.metaIds.length && typeof window.fbq === "function") window.fbq("track", "PageView");
    if (pixels.googleTagId && typeof window.gtag === "function") window.gtag("event", "page_view", { page_path: pathname });
    if (pixels.tiktokPixelId && window.ttq?.page) window.ttq.page();
  }, [pathname, pixels]);

  return (
    <>
      {pixels.metaIds.length > 0 && (
        <Script id="store-meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
${pixels.metaIds.map((id) => `fbq('init','${id}');`).join("\n")}
fbq('track','PageView');`}
        </Script>
      )}

      {pixels.googleTagId && (
        <>
          <Script id="store-gtag-src" strategy="afterInteractive" src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(pixels.googleTagId)}`} />
          <Script id="store-gtag-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=window.gtag||gtag;gtag('js',new Date());gtag('config','${pixels.googleTagId}');`}
          </Script>
        </>
      )}

      {pixels.tiktokPixelId && (
        <Script id="store-tiktok-pixel" strategy="afterInteractive">
          {`!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=r;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript";n.async=!0;n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};ttq.load('${pixels.tiktokPixelId}');ttq.page()}(window,document,'ttq');`}
        </Script>
      )}
    </>
  );
}

const fired = new Set<string>();

/** Fires one storefront event to the creator's pixels on mount, deduped per event+id. */
export function StorePixelEvent({ pixels, event, data, eventId }: { pixels: ResolvedPixels; event: PixelEventName; data: PixelEventData; eventId?: string }) {
  useEffect(() => {
    const key = `${event}:${eventId ?? window.location.pathname}`;
    if (fired.has(key)) return;
    fired.add(key);
    fireStorePixel(pixels, event, data, eventId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, eventId]);
  return null;
}
