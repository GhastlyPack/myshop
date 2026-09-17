# Step 2 — Gaps in Stan and how visitmy.shop beats it

_2026-09-16. Ranked by how much it matters to a creator selling digital products from an Instagram bio, weighted toward what we can ship in V1 (no payments yet)._

## A. Gaps we exploit in V1

### 1. Every Stan store looks the same
Theme + two colors. No fonts, no font size, no layout choice, no custom CSS. Reviewers call this out constantly.
**Ours:** real design controls from day one — font pairing, layout variants (list / grid / featured-hero), card styles, background image/gradient, accent + surface + text colors, button shape. Live preview while editing. Still guard-railed so stores stay mobile-clean.

### 2. Checkout friction on digital goods
Stan asks for a full mailing address on a $10 PDF by default, plus a reCAPTCHA and two checkboxes.
**Ours:** name + email only for free downloads (the whole V1). When payments land, the same rule: never ask for what the product doesn't need. Optional custom fields stay optional.

### 3. Lead magnet is a second-class product
Stan's "Collect Emails" product can't be turned into a landing page after the fact, has no checkout page, and its confirmation email silently doesn't send if the file is missing. Stan's own featured creator sends her freebie through Flodesk instead of Stan.
**Ours:** one product model. Any product is free or paid, listed or hidden, storefront-card or standalone landing page, all toggles. Delivery always fires; if no file is attached the product can't be published.

### 4. Product URLs get a forced numeric suffix
`stan.store/user/p/my-guide-4821`.
**Ours:** `visitmy.shop/user/my-guide`. Slugs are unique per creator, so no suffix needed.

### 5. No buyer-submitted reviews
Creators paste testimonials by hand.
**Ours:** post-download "was this useful?" rating + optional quote, creator approves before it shows. Social proof that compounds on its own.

### 6. No customer portal for downloads
Buyers dig through email to re-find a file. Stan lists this as a roadmap item.
**Ours:** magic-link "my downloads" page at `visitmy.shop/me` keyed to email. Every download ever, across every creator on the platform. This is also our cross-creator network effect.

### 7. Weak Instagram-native mechanics
Stan's AutoDM is keyword → one message. No flows, and it is a separate tab from the product.
**Ours (V1-lite, V2-full):** every product gets a "DM keyword" field. V1 = generate the caption/CTA copy and deep link for the creator. V2 = Instagram Graph API auto-reply that sends the product link (we already run Meta apps and CAPI for other projects).

### 8. Analytics are shallow on the base plan
Pixel tracking is Pro-only ($99).
**Ours:** first-party analytics on every plan — views, clicks per card, download conversions, traffic source (IG vs TikTok vs direct via UTM/referrer). Meta Pixel + CAPI on the base plan; it costs us nothing and we already know how to wire it.

### 9. Stan branding removal is a $99/mo upsell
**Ours:** subtle "made with visitmy.shop" footer on the base plan; removable on the higher tier later. Keep it, but make it tasteful and clickable, since it is our growth loop.

## B. Gaps we exploit after payments land (Commas)
- **Pricing tiers under one product** (Stan roadmap, unshipped). Basic/Plus/Pro variants of one download.
- **Multiple order bumps** (Stan allows one, Pro only).
- **Pay-what-you-want** and $0 minimum with optional tip. Stan requires ≥$0.50 for bumps.
- **Transparent pricing model.** Stan = $29 fixed before your first sale. Ours = $30/mo + transaction fee. We need to make the fee feel fair: show creators a live "you keep $X" number on every product.
- **Discount codes + limited quantity on the base plan.**

## C. Where we deliberately do NOT compete in V1
Courses, memberships, bookings, webinars, communities, email broadcasts, affiliate program, funnels. These are why Stan charges $99. We win the bio-link + digital-download wedge first, with a better storefront and better delivery, and expand once creators are already on the domain.

## D. Competitive frame
| | Stan | Beacons | Gumroad | Linktree | **visitmy.shop** |
|---|---|---|---|---|---|
| Monthly | $29 / $99 | free / $30 | free | free / paid | $30 |
| Txn fee | 0% | 9% free tier, 0% paid | 10%+$0.50 | 12% | TBD % (Commas) |
| Custom design | weak | medium | none | medium | **strong** |
| Buyer portal | no | no | yes (library) | no | **yes** |
| IG-native | AutoDM | some | no | no | **keyword per product** |
| Custom domain | no | paid | no | paid | later |

## E. V1 feature list (locked)
Creator side
- Auth0 sign-up/login, claim `visitmy.shop/username`
- Profile: avatar, name, bio, social links
- Products: title, subtitle, description, thumbnail, file(s) or URL, free, listed/hidden, slug, custom fields, DM keyword
- Sections + drag reorder
- Design editor with live preview (fonts, layout, colors, button style, background)
- Leads/customers table with CSV export
- Analytics: views, clicks, downloads, sources
- Confirmation email customization

Buyer side
- Fast, mobile-first storefront at `/[username]`
- Product page at `/[username]/[slug]`, standalone landing mode
- Name+email → instant download + email with link
- `/me` portal (magic link) listing all downloads
- Rating/review after download

Platform
- Meta Pixel + CAPI events (PageView, ViewContent, Lead)
- "Made with visitmy.shop" footer
- Admin: user list, product count, storage usage
