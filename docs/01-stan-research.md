# Step 1 — What Stan.store actually is

_Researched 2026-09-16 from Stan's public site, help center (help.stan.store), a live creator store (@abigailpeugh), and third-party reviews. No account was created._

## Positioning
- "All-in-one creator store." A link-in-bio page that hosts products instead of linking out to them.
- Founder story: John Hu, ex-TikTok creator. Mission = "help anyone work for themselves."
- Scale: $1.7M ARR (2022) → $14.7M (2023) → $28.3M (2024). Real, proven demand.
- Headline promise: **0% transaction fees, always.** They monetize purely on subscription.

## Pricing
| Plan | Price | Includes |
|---|---|---|
| Creator | $29/mo or $300/yr | storefront, bookings, courses, memberships, lead magnets, community, AutoDM, basic analytics |
| Creator Pro | $99/mo or $948/yr | + funnels, order bumps, discount codes, limited qty, payment plans (Afterpay/Klarna), affiliate program, email flows/broadcasts, pixel tracking, remove Stan branding |
| Trial | 14 days free | can sell during trial once Stripe/PayPal connected |

No free plan. Payments run through the creator's own Stripe or PayPal account.

## Product types
1. **Digital Download** — file upload (any type, ≤5GB, 500MB recommended) OR redirect-to-URL. Has a checkout page. Can become a hidden "landing page."
2. **Collect Emails / Applications** (lead magnet) — free only, name+email required, custom fields, delivers file or link by email. No checkout page. Cannot be converted to a landing page after creation.
3. Coaching calls (Zoom/GMeet + Google Calendar), Webinars, Courses (password-protected portal), Memberships (recurring), Community, Custom products (AMA / personalized video), External links.

## Storefront anatomy (what a buyer sees)
- Centered avatar, display name, social icon row.
- Vertical stack of product cards, optionally grouped under **Sections** (drag-to-reorder; empty sections hide).
- Card styles: Button / Callout / Preview. Each has thumbnail, title, subtitle, price, CTA button.
- Design: pick a theme, then button color + background color. Font color auto-flips black/white. **No font-size control, no custom CSS/HTML, no custom domain.** Stan branding in footer unless Pro.
- URL: `stan.store/username`. Products at `stan.store/username/p/slug-1234` (numeric suffix is forced).

## Checkout (observed on a live $299 product)
- Long-form sales page: banner image, price, rich-text description, testimonial images, then the form.
- Form fields: name, email, **full address (street, city, state, country, postal)**, marketing opt-in checkbox, terms checkbox, reCAPTCHA, then "Pay Now" / "Payment Plan."
- Address is required by default even for digital goods; creators must find a setting to remove it.
- After purchase: confirmation page with the download + confirmation email with the download. Stripe sends a separate receipt.

## Seller dashboard (from help docs)
Tabs: My Store (products + sections + landing pages), Edit Design, Income, Customers, Analytics, Funnels (Pro), AutoDM, Email (Pro), Settings.
- Product editor tabs: Thumbnail → Checkout Page → Options → Advanced.
- Options: manual reviews (no buyer-submitted reviews), confirmation email text, email flow, order bump, affiliate share.
- Advanced: edit slug, discount codes, limit quantity.
- Team access, currency, T&C toggle, language.

## Notable features
- **AutoDM**: Instagram keyword → auto-DM with product link, plus optional comment-back. Analytics: sent/opened/clicks/opt-ins. No multi-step flows.
- **Funnels** (Pro): entry page → offer → upsell/downsell paths, up to 20 pages.
- **Order bumps** (Pro): one per product, paid products only, 4 visual styles.
- **Affiliate share** (Pro): customers resell for commission.
- **Email flows/broadcasts** (Pro): unlimited sends, 5k contact import cap, physical address required.
- Integrations: Zapier, Zoom, Google Calendar, Mailchimp/Flodesk/Aweber via Zapier. No native webhooks documented.

## Stan's own "on our radar" list (unshipped as of today)
- Pricing tiers under one product
- Custom domains
- Cross-creator customer portal for purchases
- Multiple stores under one account
- About-me section (theme-dependent)
- Multiple order bumps per product
- Buyer-submitted reviews

## Sources
- https://stan.store, https://www.stan.store/about, https://stan.store/abigailpeugh
- https://help.stan.store (articles 13, 14, 25, 31, 37, 74, 86, 109, 149, 151, 171, 180, 197, 205, 208, 231, 234, 241, 250, 337, 377, 407)
- https://www.group.app/blog/stan-store-review/
- https://popup.fm/blog/stan-store-review-2026
- https://ca.trustpilot.com/review/stan.store
- https://crevio.co/blog/is-stan-store-legit
- https://fourthwall.com/blog/stan-store-alternatives
- https://useclima.com/blog/gumroad-vs-stan-store-vs-beacon-vs-clima
