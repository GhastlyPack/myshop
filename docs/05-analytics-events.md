# Google Analytics 4 events

Measurement ID `G-BQJ8RLRS8G`, loaded site-wide in production by `@next/third-parties` (see `src/app/layout.tsx`). Page views fire automatically, including client-side navigations. Custom events go through `ga()` in `src/lib/ga.ts`; components that fire once on mount use `GaEvent`; downloads, outbound links, social links, and CTAs are caught by one delegated click listener (`GaAutoEvents`). Nothing fires in development.

## Funnel

| Step | Event | Params | Where |
|---|---|---|---|
| Lander CTA | `cta_click` | label, link_url, page | any `.ld-btn` or claim box |
| Claim box submitted | `claim_link_start` | location (hero / footer_cta), username_entered | landing claim form |
| Signed in | `login` (once per session) | method, has_store · user property `user_role`, `has_store` | dashboard layout |
| New creator | `sign_up`, `store_created` | username, has_avatar, has_bio | onboarding |
| Product lifecycle | `product_created`, `product_saved`, `product_published`, `product_unpublished` | product_type, is_free, card_style | editor |
| Store design | `design_saved` | preset, layout, heading_font | design editor |
| Store visibility | `store_published`, `store_unpublished` | | settings |
| Link | `username_changed`, `link_copied` | label | settings, copy buttons |
| Payments | `stripe_connect_start`, `stripe_connected` | | settings |
| Instagram | `instagram_connect_start`, `instagram_connected` | | settings |
| Storefront | `store_view` | store, product_count, layout | store page |
| Product page | `view_item` | store, currency, value, is_free, items[] | product page |
| Card click | `select_item` | item_list_name, external, items[] | product cards |
| Social / outbound | `social_click`, `click_outbound` | network / link_domain, link_url | any store |
| Checkout start | `begin_checkout` | store, currency, value, is_free, bump_added, items[] | checkout form submit |
| Free download | `generate_lead` (once per order) | transaction_id, store, currency, value 0, items[] | thanks page |
| Paid order | `purchase` (once per order) | transaction_id, store, currency, value, items[] | thanks page |
| File download | `file_download` | file_name, page | thanks page, library |
| Review | `review_submitted` | product | thanks page |
| Buyer library | `library_link_requested`, `library_open` | stores, items · user property `user_role=buyer` | /me |

## In GA4, mark these as key events (conversions)

`purchase`, `generate_lead`, `store_created`, `product_published`, `stripe_connected`.

Register `store`, `is_free`, `product_type`, `location` as custom dimensions (event scope) and `user_role` as a user-scoped dimension so they show up in reports.
