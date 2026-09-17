import { sendGAEvent } from "@next/third-parties/google";

/**
 * Google Analytics 4 events. One name per funnel step so reports read like the product:
 *
 * Marketing   cta_click · claim_link_start
 * Creator     sign_up · login · store_created · product_created · product_saved · product_published ·
 *             product_unpublished · design_saved · store_published · store_unpublished · username_changed ·
 *             link_copied · stripe_connect_start · stripe_connected · instagram_connected
 * Storefront  store_view · view_item · select_item · social_click · click_outbound
 * Checkout    begin_checkout · generate_lead (free) · purchase (paid) · file_download · review_submitted
 * Library     library_link_requested · library_open
 *
 * Recommended GA4 names (view_item, select_item, begin_checkout, purchase, generate_lead, login, sign_up,
 * file_download) are used where they exist so the built-in ecommerce reports light up.
 */
export type GaItem = { item_id: string; item_name: string; price?: number; quantity?: number; item_category?: string };

function ready() {
  return typeof window !== "undefined" && Array.isArray((window as unknown as { dataLayer?: unknown[] }).dataLayer);
}

/** Fire an event. Silent no-op when GA isn't loaded (dev, blocked, or before hydration). */
export function ga(event: string, params: Record<string, unknown> = {}) {
  if (!ready()) return;
  try {
    sendGAEvent("event", event, params);
  } catch {}
}

/** Set user-scoped properties (e.g. role) for every following event in the session. */
export function gaUser(props: Record<string, string | number | boolean>) {
  if (!ready()) return;
  try {
    sendGAEvent("set", "user_properties", props);
  } catch {}
}

/** Shape a product for GA4 ecommerce params. */
export function gaItem(p: { id: string; title: string; priceCents?: number; type?: string }): GaItem {
  return { item_id: p.id, item_name: p.title, price: (p.priceCents ?? 0) / 100, quantity: 1, item_category: p.type };
}
