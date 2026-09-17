# Step 3 — Tech stack and build plan

_2026-09-16. Stack approved. Payments clarified: **creators connect their own Stripe/PayPal and buyers pay them directly (V1). Our own $30/mo + transaction-fee billing is NOT wired yet** (lands later via Commas / Stripe application fees)._

## 1. Stack

| Layer | Choice | Why |
|---|---|---|
| App | Next.js 15 (App Router), TypeScript, Tailwind, shadcn/ui | same as every other GhastlyPack project; Vercel-native |
| Hosting | Vercel (team `vagents`), domain `visitmy.shop` | preview on every push, prod on `main` |
| Creator auth | Auth0 (Google + email/password) via `@auth0/nextjs-auth0` | agreed; same as myworkpet |
| Buyer auth | none. Magic link (Resend) → signed session cookie for `/me` | buyers never create accounts |
| Database | Supabase Postgres + Drizzle ORM + drizzle-kit migrations | plain SQL we control; RLS not needed (server-only access) |
| File storage | AWS S3, presigned PUT for uploads (up to 5 GB, multipart >100 MB), presigned GET (60 s) for downloads | Vercel Blob is too small/expensive for 500 MB files |
| Images | Vercel Image Optimization over S3 public bucket for thumbnails/avatars | |
| Email | Resend from `hello@visitmy.shop` (React Email templates) | same as Ashur / Rere |
| Creator payments | **Stripe Connect (Standard accounts, OAuth)** + direct charges via Stripe Checkout on the connected account | this is exactly how Stan works; creator keeps their own Stripe |
| Creator payments 2 | **PayPal Commerce Platform** (partner referral onboarding) | needs PayPal partner approval — apply now, ship in M7 |
| Our billing | **deferred**. Schema has `subscriptions` + `platform_fee_bps` so it's a flip, not a rebuild | Commas later; or Stripe `application_fee_amount` on the direct charge |
| Analytics | first-party `events` table + Meta Pixel + CAPI (server) | already know the wiring from Sweat Equity / Ashur |
| Background jobs | Vercel Cron + Postgres queue table (`jobs`) | no extra infra |
| Rate limit / abuse | Upstash Redis (free tier) on checkout + lead endpoints; Cloudflare Turnstile only if abuse appears | no reCAPTCHA by default (Stan gap) |
| Admin | `/admin` gated to `ADMIN_EMAILS` | same pattern as myworkpet |

## 2. Domain / URL map

```
visitmy.shop/                      marketing lander + sign up
visitmy.shop/[username]            storefront (ISR, revalidated on publish)
visitmy.shop/[username]/[slug]     product page + checkout (free or paid)
visitmy.shop/[username]/[slug]?lp=1  standalone landing-page mode (no store chrome)
visitmy.shop/me                    buyer portal (magic link)
visitmy.shop/d/[token]             signed download redirect
visitmy.shop/app/...               creator dashboard (Auth0)
visitmy.shop/admin                 platform admin
visitmy.shop/api/webhooks/stripe   Connect webhooks
visitmy.shop/api/webhooks/paypal
```
Reserved usernames: app, admin, me, d, api, login, signup, pricing, blog, help, terms, privacy, static, _next, and profanity list.

## 3. Data model (Drizzle, Postgres)

```
users            id, auth0_sub, email, name, role(creator|admin), created_at
stores           id, user_id, username(unique, citext), display_name, bio, avatar_key,
                 socials jsonb, theme jsonb, currency, published, created_at
sections         id, store_id, title, position
products         id, store_id, section_id?, slug (unique per store), type(download|link),
                 title, subtitle, description(md), thumbnail_key, card_style,
                 price_cents (0 = free), currency, listed, standalone_only,
                 fields jsonb[], dm_keyword, confirmation_subject, confirmation_body,
                 status(draft|published), position, created_at
product_files    id, product_id, s3_key, filename, bytes, mime, position
product_links    id, product_id, url, label
payment_accounts id, store_id, provider(stripe|paypal), external_id, status, details jsonb
orders           id, store_id, product_id, buyer_email, buyer_name, custom_fields jsonb,
                 amount_cents, currency, provider(free|stripe|paypal), provider_ref,
                 status(pending|paid|refunded|failed), platform_fee_cents (0 for now),
                 source jsonb (utm, referrer, ig), created_at
entitlements     id, order_id, product_id, buyer_email, token, revoked, created_at
downloads        id, entitlement_id, file_id, ip, ua, created_at
reviews          id, product_id, order_id, rating, quote, approved, created_at
events           id, store_id, product_id?, type(view|click|checkout|lead|purchase|download),
                 session_id, source jsonb, created_at   (partitioned by month later)
buyer_sessions   id, email, token_hash, expires_at
subscriptions    id, user_id, plan, status, provider, external_id   (unused until Commas)
jobs             id, type, payload, run_at, attempts, done
```

## 4. Key flows

**Claim a store:** Auth0 login → `/app/onboarding` → pick username (live availability check) → avatar/name/bio/socials → land in dashboard with an empty store + one sample product.

**Create a product:** form with live phone-frame preview → files upload straight to S3 via presigned URLs (progress bar, multipart for big files) → publish → storefront ISR revalidate.

**Free checkout:** name + email (+ custom fields) → server creates order(free) + entitlement → redirect to `/[username]/[slug]/thanks?e=token` showing files + "sent to your email" → Resend email with `/d/token` links → CAPI `Lead`.

**Paid checkout (Stripe):** product page → "Buy" → server creates Stripe Checkout Session **on the connected account** (`stripeAccount` header), `application_fee_amount = 0` for now, metadata = order id → hosted Stripe page (Apple/Google Pay, Link) → webhook `checkout.session.completed` (Connect endpoint) → mark paid, create entitlement, email, CAPI `Purchase` → return to thanks page. Refunds from the creator's dashboard call the connected account.

**Connect Stripe:** Settings → Payments → "Connect Stripe" → Stripe OAuth (Standard) → store `stripe_user_id` → verify `charges_enabled` before allowing paid products to publish.

**Buyer portal:** `/me` → email → magic link → list every entitlement for that email across all stores → download / re-rate.

**Download:** `/d/[token]` → check entitlement not revoked → log → 302 to 60-second presigned S3 GET. Files are never public.

**Design editor:** `theme` jsonb {font, layout(list|grid|hero), cardStyle, colors{bg,surface,text,accent}, buttonShape, bgImageKey}. Rendered as CSS variables on the storefront. Presets to start from.

**DM keyword (V1-lite):** per-product field → dashboard shows generated caption + short link `visitmy.shop/[username]/[slug]?src=ig`. Graph API auto-reply is V2.

## 5. Milestones

| # | Milestone | Ships |
|---|---|---|
| M0 | Scaffold | Next.js app, Tailwind/shadcn, Drizzle + first migration, Auth0 wired, health page, Vercel preview live, `.env.example`, README |
| M1 | Claim + profile | onboarding, username claim, profile editor, empty storefront renders at `/[username]` |
| M2 | Products + storefront | product CRUD, S3 uploads, sections + drag reorder, card styles, product page, ISR |
| M3 | Free delivery | name+email checkout, entitlements, `/d/` downloads, Resend emails, thanks page, `/me` portal |
| M4 | Stripe Connect | connect flow, paid checkout, webhooks, refunds, Income tab, customers table + CSV |
| M5 | Design editor | theme editor with live preview, presets, background images |
| M6 | Growth layer | events + analytics dashboard, Meta Pixel + CAPI, reviews, DM keyword copy generator, "made with" footer |
| M7 | PayPal + polish | PayPal onboarding + checkout (if partner approval is back), landing-page mode, admin, rate limits, SEO/OG cards |
| — | Later | our billing (Commas / app fees), pricing tiers, order bumps, discount codes, IG auto-reply, custom domains |

Each milestone = branch → PR → Vercel preview → merge to `main` → prod. First real testers come in after M3 (free products) and again after M4 (paid).

## 6. What I need from you (accounts / keys)
1. **Vercel**: create project `myshop` under `vagents` from the GitHub repo, attach `visitmy.shop` (DNS at your registrar → Vercel). Or give me access and I'll do it.
2. **Auth0**: new tenant or app `visitmy.shop` (Regular Web App). Need domain, client id, client secret. Enable Google connection.
3. **Supabase**: new project `myshop`. Need the Postgres connection string (pooler, port 6543) and direct string for migrations.
4. **AWS**: S3 bucket `visitmyshop-files` (private) + `visitmyshop-public` (thumbnails) in us-east-1, IAM user with put/get on both. Or I can create them with the AWS CLI if the credentials on this machine have rights.
5. **Resend**: add + verify `visitmy.shop` domain, API key.
6. **Stripe**: a platform Stripe account for visitmy.shop with **Connect enabled** (Standard). Need publishable key, secret key, Connect client id, webhook signing secret. Test mode until launch.
7. **PayPal**: apply for **PayPal Commerce Platform partner** access (developer.paypal.com → Partner). This takes days to weeks — start now.
8. **Meta**: a new Pixel/dataset for visitmy.shop + CAPI access token.
9. **Upstash**: free Redis (I can create it from the Vercel integration).

## 7. Open decisions (defaults I'll use unless told otherwise)
- Currency: USD only in V1, creator-selectable later.
- Max file size: 5 GB, warn above 500 MB.
- Free-product spam: rate-limit by IP + email, no captcha.
- Marketing opt-in checkbox on checkout: **on by default, unchecked**, stored on the order (creator's list, exportable).
- Stripe hosted Checkout (not embedded Payment Element) for V1: fastest to ship, Apple/Google Pay free, PCI handled. Embedded comes later if conversion data says so.
