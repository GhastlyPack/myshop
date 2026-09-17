import { PLANS } from "./plans";

/**
 * Competitor comparison data for /compare and the per-competitor pages.
 * Every claim is against published plans, checked September 2026. Keep it honest: say what they do well.
 */
export type CompetitorKey = "stan" | "linktree" | "beacons" | "gumroad";

export const COMPETITORS: Record<CompetitorKey, { name: string; slug: string; logo: string; price: string; fee: string; verdict: string; bestFor: string; strengths: string[]; gaps: string[] }> = {
  stan: {
    name: "Stan store",
    slug: "stan-store",
    logo: "/landing/logos/stan.png",
    price: "$29 or $99 a month",
    fee: "0%",
    verdict: "The best-known creator store. Strong on courses and bookings, weak on design and checkout.",
    bestFor: "Coaches selling courses, memberships, and calendar bookings today.",
    strengths: ["Courses, memberships, webinars, and bookings on paid plans", "Email broadcasts and an affiliate program on Pro", "Large creator community and lots of tutorials"],
    gaps: ["Every store gets a theme and two colors, so they all look alike", "Product URLs get a forced numeric suffix", "A free download asks for a full mailing address, two checkboxes, and a reCAPTCHA", "Pixel tracking and branding removal cost $99 a month", "No buyer download library"],
  },
  linktree: {
    name: "Linktree",
    slug: "linktree",
    logo: "/landing/logos/linktree.png",
    price: "Free, paid tiers for commerce",
    fee: "On commerce tiers",
    verdict: "A page of links, not a store. Great at pointing people elsewhere, thin at selling a file.",
    bestFor: "Creators who only need one page that lists everything they do.",
    strengths: ["Free tier is enough for a plain link page", "Huge install base, familiar to every audience", "Integrations with most social and email tools"],
    gaps: ["Selling a file needs a paid tier and a transaction fee", "No product pages with their own URLs", "No buyer library, no reviews", "Design options are shallow until you pay"],
  },
  beacons: {
    name: "Beacons",
    slug: "beacons",
    logo: "/landing/logos/beacons.png",
    price: "Free or about $30 a month",
    fee: "9% on the free tier, 0% on paid",
    verdict: "A link page with a store bolted on, plus a media kit and email tools. Broad, but the store is one tab among many.",
    bestFor: "Creators who want a media kit and brand-deal tools alongside a link page.",
    strengths: ["Media kit and brand-deal tooling", "Email marketing on paid plans", "Free tier includes a basic store"],
    gaps: ["9% fee on the free tier", "The store is a section of a link page, not the page itself", "No cross-creator buyer library", "Design controls are template-level"],
  },
  gumroad: {
    name: "Gumroad",
    slug: "gumroad",
    logo: "/landing/logos/gumroad.png",
    price: "Free",
    fee: "10% plus a fixed fee per sale",
    verdict: "The original digital-products checkout. Reliable delivery, no monthly fee, but the highest fee and no bio-link storefront.",
    bestFor: "Sellers who already drive traffic from a website or newsletter and want zero monthly cost.",
    strengths: ["No monthly fee", "Dependable delivery and a buyer library", "Ratings from buyers", "Memberships and pay-what-you-want"],
    gaps: ["10% of every sale plus a fixed fee, the highest here", "Profile pages are not built as a bio link", "Almost no design control", "No Instagram keyword replies or pixel-first analytics"],
  },
};

export type MatrixRow = { label: string; us: string; stan: string; linktree: string; beacons: string; gumroad: string };

const basic = PLANS[0];
const pro = PLANS[1];

export const MATRIX: MatrixRow[] = [
  { label: "Monthly price", us: `$${basic.monthly} Basic, $${pro.monthly} Pro`, stan: "$29, $99", linktree: "Free, paid tiers", beacons: "Free, ~$30", gumroad: "Free" },
  { label: "Fee on sales", us: `${basic.feePercent}% Basic, ${pro.feePercent}% Pro`, stan: "0%", linktree: "On commerce tiers", beacons: "9% free, 0% paid", gumroad: "10% + fixed fee" },
  { label: "Free trial", us: "7 days of Pro", stan: "14 days", linktree: "Free tier", beacons: "Free tier", gumroad: "Free tier" },
  { label: "Store design", us: "Presets on Basic; fonts, colors, layout on Pro", stan: "Theme + two colors", linktree: "Themes, more on paid", beacons: "Templates", gumroad: "Minimal" },
  { label: "Product URLs", us: "visitmy.shop/you/my-guide", stan: "Numeric suffix forced", linktree: "None", beacons: "Store tab", gumroad: "Clean" },
  { label: "Free download asks for", us: "Name and email", stan: "Full mailing address + captcha", linktree: "n/a", beacons: "Email", gumroad: "Email" },
  { label: "Buyer download library", us: "Yes, across every creator", stan: "No", linktree: "No", beacons: "No", gumroad: "Yes" },
  { label: "Reviews from buyers", us: "Yes, you approve them", stan: "Pasted by hand", linktree: "No", beacons: "No", gumroad: "Ratings" },
  { label: "Pixel tracking", us: "Pro", stan: "$99 plan", linktree: "Paid plans", beacons: "Paid plans", gumroad: "Yes" },
  { label: "Instagram keyword replies", us: "Pro", stan: "AutoDM", linktree: "No", beacons: "Some", gumroad: "No" },
  { label: "Discount codes, bumps, limits", us: "Pro", stan: "Paid plans", linktree: "Some", beacons: "Some", gumroad: "Discounts" },
  { label: "Courses, memberships, bookings", us: "Coming soon", stan: "Yes", linktree: "No", beacons: "Some", gumroad: "Memberships" },
];

export const COMPARED_ON = "September 2026";
