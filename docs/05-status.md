# Status — V1 built locally (2026-09-17)

All five packages from `04-contracts.md` are merged into `main`. Production build passes. The full buyer loop and every creator page were verified in the browser at desktop and 375px.

## What works today (zero external keys)
- Storefront `/[username]` with 6 theme presets, 3 layouts, 3 card styles, sections, socials, OG metadata. Demo: `pnpm seed` → `/demo`.
- Product page + checkout: name/email/custom fields/opt-in. Free products deliver instantly (order → entitlement → email → thanks page → `/d/<token>` signed download). Paid products show a friendly "payments not set up" until Stripe is connected.
- Buyer portal `/me` via magic link. Post-download reviews (creator-approved).
- Creator dashboard: onboarding (claim username), products board with drag-reorder + sections, 4-tab product editor with direct-to-storage uploads, design editor with live phone/desktop preview, settings (profile, socials, currency, payments, delete store), income (orders, refunds, CSV), customers (leads, opt-ins, CSV), analytics (KPIs, funnel, daily chart, top products, traffic sources), reviews moderation, mobile drawer nav.
- Admin `/admin` (read-only platform stats, store search).
- Stripe Connect (Standard OAuth), Checkout Sessions on the connected account, Connect webhook (paid / refunded / account events), refunds. 17 tests against a fake Stripe: `STRIPE_SECRET_KEY=sk_test_fake STRIPE_CONNECT_CLIENT_ID=ca_fake pnpm exec tsx --tsconfig scripts/tsconfig.test.json scripts/test-payments.ts`.
- Meta Pixel + CAPI (ViewContent / InitiateCheckout / Lead / Purchase, deduped by order id). Instagram DM keyword kit per product.
- Platform fee plumbing (`stores.platform_fee_bps`, default 0) and `subscriptions` table ready for Commas.

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
3. **AWS S3**: private `visitmyshop-files`, public `visitmyshop-public` (+ CORS allowing PUT from the app origin), IAM user → `AWS_ACCESS_KEY_ID/SECRET`, `S3_PUBLIC_BASE_URL`.
4. **Resend**: verify `visitmy.shop` → `RESEND_API_KEY`.
5. **Stripe** platform account with Connect (Standard): `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_CONNECT_CLIENT_ID`; Connect redirect URI `https://visitmy.shop/api/payments/stripe/callback`; a *Connect* webhook at `https://visitmy.shop/api/webhooks/stripe` for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`, `account.updated`, `account.application.deauthorized` → `STRIPE_WEBHOOK_SECRET`.
6. Optional now: `META_PIXEL_ID` + `META_CAPI_TOKEN`; PayPal partner application (M7).
7. `vercel link` (team vagents) → add env → `git push` deploys. Attach `visitmy.shop`.

Without `DATABASE_URL` every page except `/` will 500 on Vercel, so item 1 is the gate.

## Known gaps / follow-ups
- Rate limiting is in-memory per lambda (fine for launch; Upstash later).
- Removing a design background image doesn't delete the old object from storage.
- Partial Stripe refunds leave the order `paid` by design.
- PayPal connect (needs partner approval), our own billing (Commas), pricing tiers, order bumps, discount codes, IG auto-reply, custom domains: post-V1.
