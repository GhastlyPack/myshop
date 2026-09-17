# Status — V1 built locally (2026-09-17)

All five packages from `04-contracts.md` are merged into `main`. Production build passes. The full buyer loop and every creator page were verified in the browser at desktop and 375px.

## What works today (zero external keys)
- Storefront `/[username]` with 6 theme presets, 3 layouts, 3 card styles, sections, socials, OG metadata. Demo: `pnpm seed` → `/demo`.
- Product page + checkout: name/email/custom fields/opt-in. Free products deliver instantly (order → entitlement → email → thanks page → `/d/<token>` signed download). Paid products show a friendly "payments not set up" until Stripe is connected.
- Buyer portal `/me` via magic link. Post-download reviews (creator-approved).
- Creator dashboard: onboarding (claim username), products board with drag-reorder + sections, 4-tab product editor with direct-to-storage uploads, design editor with live phone/desktop preview, settings (profile, socials, currency, payments, delete store), income (orders, refunds, CSV), customers (leads, opt-ins, CSV), analytics (KPIs, funnel, daily chart, top products, traffic sources), reviews moderation, mobile drawer nav.
- Admin `/admin` (read-only platform stats, store search).
- Stripe Connect (Standard OAuth), Checkout Sessions on the connected account, Connect webhook (paid / refunded / account events), refunds. 22 tests against a fake Stripe: `STRIPE_SECRET_KEY=sk_test_fake STRIPE_CONNECT_CLIENT_ID=ca_fake pnpm exec tsx --tsconfig scripts/tsconfig.test.json scripts/test-payments.ts`.
- Meta Pixel + CAPI (ViewContent / InitiateCheckout / Lead / Purchase, deduped by order id). Instagram DM keyword kit per product.
- Platform fee plumbing (`stores.platform_fee_bps`, default 0) and `subscriptions` table ready for Commas.

## Commerce features (2026-09-17)
All three live on the product editor's **Checkout** tab and are enforced server-side (the client total is never trusted; `checkoutAction` recomputes everything from `src/lib/commerce.ts`). `orders.amount_cents` is always the charged total (price − discount + bump), so Income/Analytics/Customers sums need no change; `orders.discount_code/discount_cents/bump_product_id/bump_cents` record the parts. Migration `drizzle/0003_cold_korvac.sql`.

- **Discount codes** (`discount_codes`, per product, code uppercase + unique per product, exactly one of `percent_off` / `amount_off_cents`, optional `max_uses` / `expires_at`, `active`). Managed in the editor (saved instantly, independent of the Save button). Buyers open "Have a code?" on a paid product → `applyDiscountAction` validates (exists, active, not expired, uses < max, paid product, result not between $0.01 and $0.49) and the button total updates. The discount is applied to the main line item's `unit_amount`; the bump is never discounted by a code (it has its own % off). A code that brings the price to $0 (and no bump) becomes a free claim: `orders.provider = free`, entitlement + delivery email immediately. `uses` increments when the order is **paid** (free/$0 at once, Stripe from the webhook) and is guarded in SQL so it never passes `max_uses`.
- **Limited quantity** (`products.quantity_limit`, `quantity_sold`). Editor shows "X of Y sold". Storefront card + product page show "Only N left" when N ≤ 10 and "Sold out" at 0 (card CTA inert, checkout form replaced, `checkoutAction` refuses using a live read, `claimFreeProduct` refuses). `quantity_sold` increments on paid (main product and, when bought as an add-on, the bump product). Nothing is reserved before payment: if two buyers race past the last unit the webhook still marks both paid, `quantity_sold` goes over the limit and the storefront shows sold out from then on. Refunds do not give units back.
- **Order bumps** (`products.bump_product_id/bump_headline/bump_discount_percent`). Only on products priced ≥ $0.50 (Stripe minimum) and only another paid, published, non-archived *download* from the same store; re-validated live at checkout and hidden when the bump product is sold out. Checkout shows a checkbox card (thumbnail, headline defaulting to "Add {title} for {price}", struck-through original price when discounted); checking it updates the button total and adds a second Stripe `line_item`. On paid the webhook creates **one entitlement per product** on the order, the delivery email lists both (`renderDeliveryEmailProducts` / `sendDeliveryEmailProducts`; the single-product signatures still work), and the thanks page + `/me` list both. `charge.refunded` / the Income refund button revoke every entitlement on the order.

Tests: the payments script now has 22 cases (discounted session amount, $0-after-discount free claim, quantity counter + sold-out refusal, bump line item + second entitlement + email, refund revoking both).

## Billing & plans (2026-09-17)
Our own subscription billing — the **creator pays us** on the **platform** Stripe account (`getStripe()`), a different object graph from Connect (buyers → the creator's connected account). Same secret key, different objects. Core code: `src/lib/billing.ts` (resolver + flows), `src/lib/billing-webhook.ts` (pure handler), routes under `src/app/api/billing/*` and `src/app/api/webhooks/billing`. Migration `drizzle/0008_flowery_otto_octavius.sql`.

- **Tiers.** Basic $9/mo · $90/yr, **5%** transaction fee. Pro $49/mo · $490/yr, **0%** fee.
- **Trial.** New signups get **14 days of full Pro (0% fee)** (`subscriptions` row created in onboarding: `plan pro`, `status trialing`, `trialEndsAt = now+14d`). When the trial lapses with no active sub → **Basic terms** (Basic features, 5% fee) with a dashboard nag banner; the storefront stays live.
- **Grandfather.** The migration backfills every existing user with `{ plan pro, status active, grandfathered true }` — comped Pro forever, no trial, no card. `resolvePlan` always returns Pro/0% for them; they see no plan picker.
- **Effective-plan primitive.** `resolvePlan(store)` → `{ tier, feeBps, trialing, status, trialEndsAt, currentPeriodEnd, cancelAtPeriodEnd, grandfathered, manageable }`. `resolveEffectivePlan(sub)` is the pure, unit-tested core; the row lookup is cached per request (`react` `cache`). `requirePlan(store, "pro")` redirects Basic to `/app/billing?upgrade=…`; `planTier(store)` is the cheap gate.
- **Fee wiring.** The buyer checkout action (`src/app/[username]/[slug]/actions.ts`) now passes the seller's resolved `feeBps` (not `store.platformFeeBps`) into `startPaidCheckout`, so Basic sellers' buyers route 5% to the platform as a Stripe `application_fee`; Pro/trial = 0%. `platformFeeCents` math in `stripe.ts` is unchanged.
- **Two webhooks (distinct).** `/api/webhooks/stripe` is the **Connect** endpoint (connected-account events; `STRIPE_WEBHOOK_SECRET`) — untouched. `/api/webhooks/billing` is a **new, separate** endpoint for **platform-account** subscription events (`STRIPE_BILLING_WEBHOOK_SECRET`). Add it in the dashboard as a second webhook, **"your account"** (NOT Connect), events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`. GET→405, bad sig→400, unconfigured→503. Handler maps Stripe status → our row (plan/interval come from the price's `lookup_key`), idempotent.
- **Stripe products via lookup_key (no hardcoded ids).** Constants `basic_monthly`, `basic_yearly`, `pro_monthly`, `pro_yearly`. `scripts/setup-billing.ts` idempotently creates 2 Products + 4 Prices with those lookup keys + amounts; run once per mode: `STRIPE_SECRET_KEY=sk_test_… pnpm setup:billing` then again with the live key. Billing code resolves price ids by lookup_key at runtime (cached).
- **Gating.** Design editor (`/app/design`), Instagram auto-replies (Settings), and the product editor's Discount codes / order bumps / limited quantity / checkout questions are **Pro only** — each shows a `<ProLock>` upgrade card for Basic; existing data stays visible. "Remove branding" is enforced on the storefront: Basic stores always render the footer credit regardless of saved theme.
- **UI.** `/app/billing` shows current plan + status (trial countdown, renew/end date), the two tier cards with a monthly/annual toggle, Upgrade/Switch buttons → `/api/billing/checkout`, and a **Manage billing** button → the Stripe Customer Portal when they have a customer. "Billing" added to the dashboard nav. A slim amber nag banner shows in the `/app` layout while a store is in the lapsed-trial Basic state.
- **Env.** `STRIPE_BILLING_WEBHOOK_SECRET` (optional). `billingConfigured = stripeConfigured && STRIPE_BILLING_WEBHOOK_SECRET set` — checkout/portal need only `stripeConfigured`; only the webhook needs the billing secret.
- **Tests.** `scripts/test-billing.ts` (fake Stripe via `setStripeClient`): 19 cases — `resolvePlan` across every state, fee resolution, buyer checkout fee wiring, customer/checkout/portal, and all webhook transitions. Run: `pnpm test:billing` (with `STRIPE_SECRET_KEY=sk_test_fake STRIPE_CONNECT_CLIENT_ID=ca_fake`). Existing `pnpm test:payments` still green (22).

## Local dev
```bash
createdb myshop && cp .env.example .env.local && pnpm install && pnpm db:migrate && pnpm seed && pnpm dev
```
Sign in at `/dev/login` (any email; `ADMIN_EMAILS` gets `/admin`). Emails at `/dev/outbox`. Files in `.data/`.

## Step 5 — Vercel (in progress, 2026-09-17)
Done: project `vagents/myshop` created and linked, GitHub repo connected (push to `main` deploys production), first production build green, `visitmy.shop` added to the project and verified, `SESSION_SECRET` / `ADMIN_EMAILS` / `AWS_REGION` / `PAYPAL_ENV` / `EMAIL_FROM` set on Production + Preview, `APP_BASE_URL=https://visitmy.shop` on Production (previews derive it from `VERCEL_URL`).

Still needed:
- **DNS**: at GoDaddy add `A @ 76.76.21.21` (and `CNAME www cname.vercel-dns.com`), or switch nameservers to `ns1/ns2.vercel-dns.com`.
- **Deployment Protection → Off** (Vercel → myshop → Settings → Deployment Protection). It is currently on, so every URL redirects to Vercel SSO and buyers would be locked out.
- The keys below (paste into Vercel → Settings → Environment Variables; empty values are now ignored by the app):
1. **Supabase** project → `DATABASE_URL` (pooler, 6543) + `DATABASE_DIRECT_URL` (5432). Run `pnpm db:migrate` against it.
2. **Auth0** Regular Web App → `AUTH0_DOMAIN/CLIENT_ID/CLIENT_SECRET/SECRET`; callback `https://visitmy.shop/auth/callback`, logout `https://visitmy.shop`. Enable Google.
3. **File storage — pick one.** Fastest: **Supabase Storage** → set `SUPABASE_URL` (https://gfnivtdvwseptgyhuvxr.supabase.co) and `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Settings → API → service_role). The app creates the `files` (private) and `public` buckets on first upload; 50 MB/file on the free plan, 5 GB on Pro. Or **AWS S3**: private `visitmyshop-files`, public `visitmyshop-public` (+ CORS allowing PUT from the app origin), IAM user → `AWS_ACCESS_KEY_ID/SECRET`, `S3_PUBLIC_BASE_URL`. S3 wins if both are set.
4. **Resend**: verify `visitmy.shop` → `RESEND_API_KEY`.
5. **Stripe** platform account with Connect (Standard): `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_CONNECT_CLIENT_ID`; Connect redirect URI `https://visitmy.shop/api/payments/stripe/callback`; a *Connect* webhook at `https://visitmy.shop/api/webhooks/stripe` for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`, `account.updated`, `account.application.deauthorized` → `STRIPE_WEBHOOK_SECRET`.
6. Optional now: `META_PIXEL_ID` + `META_CAPI_TOKEN`; PayPal partner application (M7).
7. `vercel link` (team vagents) → add env → `git push` deploys. Attach `visitmy.shop`.

Without `DATABASE_URL` every page except `/` will 500 on Vercel, so item 1 is the gate.

## Known gaps / follow-ups
- Rate limiting is in-memory per lambda (fine for launch; Upstash later).
- Removing a design background image doesn't delete the old object from storage.
- Partial Stripe refunds leave the order `paid` by design.
- PayPal connect (needs partner approval), our own billing (Commas), pricing tiers, IG auto-reply, custom domains: post-V1.
