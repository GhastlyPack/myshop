# Work-package contracts (parallel build)

Five packages build V1 in parallel on separate branches. Each owns a disjoint set of paths. Shared code in `src/lib`, `src/db`, `src/components/ui`, `src/app/layout.tsx`, `src/app/app/layout.tsx`, `src/components/app/nav.tsx` is **frozen** — if you need a change there, note it in your report instead of editing (exception: adding a *new* file under `src/lib` that only you import is fine).

Do not run `drizzle-kit generate`/migrate. Schema is final for V1; if it truly blocks you, report it.
Do not add npm dependencies unless unavoidable; if you do, say so in the report.

## Shared foundation (already built)
- `src/db/schema.ts` — all tables + inferred types. `src/db/index.ts` exports `db`.
- `src/lib/auth` — `getCurrentUser`, `getCurrentStore`, `requireUser`, `requireStore`, `requireAdmin`, `loginPath`, `logoutPath`. Dev bypass at `/dev/login` when Auth0 env is unset.
- `src/lib/storage.ts` — `createUploadTicket`, `publicUrl(key)`, `signedDownloadUrl(key, filename)`, `deleteObject`. Local FS driver under `.data/` in dev.
- `POST /api/uploads/ticket` — `{bucket, filename, contentType, bytes, scope}` → `{key, url, method:"PUT", headers}`. Browser PUTs the bytes to `url`, then a server action stores `key`.
- `src/lib/mailer.ts` — `sendMail({to, subject, html, text})`. Dev outbox at `/dev/outbox`.
- `src/lib/theme.ts` — `Theme`, `resolveTheme`, `themeToCssVars`, `googleFontsHref`, `THEME_PRESETS`, `FONTS`.
- `src/lib/queries.ts` — `getPublicStoreTagged(username)`, `getPublicProduct(username, slug)`, `getStoreEditorData(storeId)`, `revalidateStore(username)`. **Every dashboard mutation must call `revalidateStore`.**
- `src/lib/track.ts` — `track({storeId, productId, type, sessionId, source})`, `sourceFromRequest(url, referrer)`.
- `src/lib/ids.ts` — `newId(prefix)`, `newToken()`.
- `src/lib/reserved.ts` — `usernameError(raw)`, `normalizeUsername`.
- `src/lib/env.ts` — `env`, `auth0Configured`, `s3Configured`, `resendConfigured`, `stripeConfigured`, `paypalConfigured`, `adminEmails`.
- `src/lib/payments/index.ts` — types `CheckoutInput`, `CheckoutSession`, `providerStatus`.

## Stubs (owner replaces the body, signature stays)
| File | Owner | Used by |
|---|---|---|
| `src/lib/payments/checkout.ts` → `startPaidCheckout`, `storeCanTakePayments` | D | B (product page) |
| `src/components/app/payments-settings.tsx` → `<PaymentsSettings storeId>` | D | A (settings page) |
| `src/components/app/dm-keyword-helper.tsx` → `<DmKeywordHelper username slug keyword title>` | E | A (product editor) |
| `src/components/meta-pixel.tsx` → `<MetaPixel pixelId>`, `trackPixel(event, params)` | E | B (storefront pages) |

## Package A — Creator dashboard (M1 + M2 seller side)
Owns: `src/app/app/onboarding/**`, `src/app/app/page.tsx`, `src/app/app/products/**`, `src/app/app/sections/**`, `src/app/app/settings/**`, `src/components/app/**` (except `nav.tsx`, `payments-settings.tsx`, `dm-keyword-helper.tsx`), `src/lib/uploads-client.ts`.
Builds: onboarding (claim username w/ live availability, display name, bio, avatar), products list w/ sections + drag reorder (dnd-kit), product editor (details, thumbnail/banner upload, files + links, price, card style, button text, listed/hidden, custom checkout fields, marketing opt-in toggle, confirmation email subject/body, dm keyword, publish/draft, delete), settings (profile, socials, currency, `<PaymentsSettings/>`, delete store). Server actions colocated in `actions.ts` files. Validate with zod. Call `revalidateStore` after every write.

## Package B — Public storefront + buyer flow (M1 storefront, M2 product page, M3 delivery)
Owns: `src/app/[username]/**`, `src/app/d/**`, `src/app/me/**`, `src/app/demo/**`, `src/components/storefront/**`, `src/emails/**`, `src/lib/buyer-session.ts`, `src/lib/free-checkout.ts`, `src/app/api/track/**`, `scripts/seed.ts`.
Builds: storefront at `/[username]` (theme CSS vars, Google fonts link, layouts list/grid/hero, card styles button/callout/preview, sections, socials row, "made with visitmy.shop" footer when `theme.showBranding`), product page `/[username]/[slug]` (banner, price, markdown description, reviews, checkout form: name+email+custom fields+opt-in; free → `free-checkout.ts` creates order+entitlement, sends email, redirects to `/[username]/[slug]/thanks?e=<token>`; paid → `startPaidCheckout`), `?lp=1` standalone landing mode (no store chrome), thanks page (lists files w/ `/d/<token>?f=<fileId>` links + links), `/d/[token]` route (verify entitlement, log download, 302 to `signedDownloadUrl`), `/me` buyer portal (email → magic link via mailer → cookie session → list all entitlements across stores), review submission (`reviews` table, from thanks page + `/me`), `/demo` → redirect to seeded demo store, `scripts/seed.ts` (creates user+store `demo` with 4 products incl. one free lead magnet + sections + theme preset). **Preview hook for Package C:** if `?previewTheme=<base64url JSON>` is present, override the store theme with it (no auth needed in dev; in prod require the store owner). Track `view`, `product_view`, `click`, `checkout_start`, `lead`, `purchase`, `download`. Render `<MetaPixel/>` in the storefront layout.

## Package C — Design editor (M5)
Owns: `src/app/app/design/**`, `src/components/app/design/**`.
Builds: `/app/design` — left panel (preset picker, fonts heading/body, layout, colors w/ hex inputs, button/card shape, border/shadow toggles, background image upload via ticket API → `bgImageKey`, overlay, gradient presets, avatar shape/size, show branding), right panel = phone-frame `<iframe src="/[username]?previewTheme=…">` updated live (debounced). Save → server action writes `stores.theme` + `revalidateStore`. Reset to preset.

## Package D — Stripe Connect + money pages (M4)
Owns: `src/lib/payments/**` (replace stubs), `src/app/api/payments/**`, `src/app/api/webhooks/**`, `src/components/app/payments-settings.tsx`, `src/app/app/income/**`, `src/app/app/customers/**`.
Builds: Stripe Connect Standard OAuth (`/api/payments/stripe/connect` → Stripe → `/api/payments/stripe/callback` → upsert `payment_accounts`, set `chargesEnabled` from account), `startPaidCheckout` → Stripe Checkout Session on the connected account (`{stripeAccount}`), `application_fee_amount = round(amount * platformFeeBps / 10000)` (0 today), `client_reference_id = orderId`, success → `/[username]/[slug]/thanks?e=<token>` (create entitlement in webhook, thanks page waits/polls if not yet), cancel → product page. Webhook `/api/webhooks/stripe` (Connect events: `checkout.session.completed`, `charge.refunded`) → idempotent by `provider_ref`, sends the confirmation email (reuse Package B's template if present, else a simple one in `src/lib/payments/email.ts`), tracks `purchase`. `<PaymentsSettings/>`: connect/disconnect Stripe, status badges, "PayPal coming soon" when `paypalConfigured` false. `/app/income`: orders table (date, product, buyer, amount, status, provider), refund action, totals. `/app/customers`: unique buyers/leads with counts + marketing opt-in + CSV export. If `STRIPE_*` env is missing, every UI shows "not configured" gracefully and free products keep working.

## Package E — Growth layer (M6) + admin
Owns: `src/app/app/analytics/**`, `src/app/app/reviews/**`, `src/app/admin/**`, `src/lib/meta.ts`, `src/components/meta-pixel.tsx` (replace stub), `src/components/app/dm-keyword-helper.tsx` (replace stub), `src/app/api/meta/**`.
Builds: `/app/analytics` (range picker 7/30/90d; store views, product views, clicks, leads, purchases, downloads; conversion funnel; top products; source breakdown from `events.source`; sparkline via inline SVG), `/app/reviews` (moderate: approve/hide/delete), `/admin` (requireAdmin: users, stores, products count, orders count, storage bytes, recent signups; impersonate-free), `MetaPixel` (client, loads fbq when `META_PIXEL_ID`, PageView) + `trackPixel`, `src/lib/meta.ts` CAPI sender (Lead/Purchase/ViewContent with event_id dedup, hashed email) callable from server code, `DmKeywordHelper` (given keyword+slug: generated IG caption, comment CTA, DM reply text, deep link with `?src=ig`, copy buttons).

## Definition of done (every package)
- `pnpm typecheck` and `pnpm exec eslint src --max-warnings=0` clean.
- Works locally with **no external keys** (dev auth, local storage, dev outbox).
- Mobile-first; storefront must look right at 375px.
- Commit on your branch with a clear message. Report: what shipped, anything skipped, any frozen-file change you need, any deps added.
