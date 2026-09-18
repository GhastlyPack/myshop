import { PLANS } from "./plans";

/**
 * The feature catalogue: what /features shows in full and the lander shows in brief.
 * Art files live in public/landing/features; the hero render is listed here too so both pages share it.
 */
export type Feature = { title: string; body: string; pro?: boolean };
export type ChapterArt = { file: string; width: number; height: number; alt: string };
export type Chapter = {
  key: string;
  eyebrow: string;
  title: string;
  intro: string;
  /** One line for the lander card. */
  brief: string;
  art: ChapterArt;
  features: Feature[];
};

export const HERO_ART: ChapterArt = { file: "hero.jpg", width: 1536, height: 1024, alt: "A phone showing a storefront of stacked cards beside a small orange awning, a coin, and a folded document" };

export const CHAPTERS: Chapter[] = [
  {
    key: "sell",
    brief: "Downloads, lead magnets, links, pricing tiers, pay what you want, up to five order bumps.",
    eyebrow: "Sell",
    title: "Any product, any price.",
    intro: "A $39 manual, a free checklist, a link to something you host elsewhere. Price it once, or let the buyer choose.",
    art: { file: "sell.jpg", width: 1200, height: 800, alt: "Three boxes in ascending size, the largest banded in orange, beside a price tag" },
    features: [
      { title: "Digital downloads", body: "Upload up to 5 GB per file. Buyers get a private link the second they pay, and every file they've ever bought stays in their library." },
      { title: "Lead magnets", body: "A free product asks for a name and an email, nothing else. No mailing address, no captcha, no friction." },
      { title: "Links", body: "Sell or give away something you host elsewhere. The card goes straight to it after checkout." },
      { title: "Pricing tiers", body: "One product, up to six prices: Basic, Plus, Pro. Each tier unlocks the files you pick.", pro: true },
      { title: "Pay what you want", body: "Set a suggested price and a floor, or no floor at all. Buyers name their number.", pro: true },
      { title: "Order bumps, plural", body: "Offer up to five one-tap add-ons above the pay button, each with its own discount. Most stores allow one.", pro: true },
      { title: "Discount codes and limited quantity", body: "Percent or amount off, expiry, max uses. Cap a launch at 50 seats and watch it sell out.", pro: true },
      { title: "Custom checkout questions", body: "Ask for a handle, a size, a goal. Answers land on the order.", pro: true },
      { title: "Clean product links", body: "visitmy.shop/you/my-guide. No random numbers stapled to the end." },
    ],
  },
  {
    key: "book",
    brief: "Sell a call. It lands on your Google Calendar with a Meet link, a prep doc, and a questionnaire.",
    eyebrow: "Book",
    title: "Sell an hour of your time.",
    intro: "A call is just another product. Buyers pick a time, pay, and it lands on your calendar with a Meet link. You never open a scheduling tool.",
    art: { file: "book.jpg", width: 1200, height: 800, alt: "A desk calendar with one date marked in orange beside a phone showing empty time slots" },
    features: [
      { title: "Google Calendar sync", body: "Connect your calendar once. Your busy times block your open hours automatically, so you can't be double-booked.", pro: true },
      { title: "Google Meet on every booking", body: "Each confirmed call gets its own Meet link, written to your calendar and emailed to both of you.", pro: true },
      { title: "Open hours, buffers, notice", body: "Set the days and hours you take calls, a buffer between them, and how far out people can book.", pro: true },
      { title: "The buyer's timezone", body: "They see a real month calendar in their own timezone. You see the call in yours." },
      { title: "Pre-call materials", body: "Attach a prep doc and it's delivered with the confirmation.", pro: true },
      { title: "Pre-call questionnaire", body: "Ask a few questions after they book. The answers are emailed to you before the call.", pro: true },
      { title: "Calendar invites, both sides", body: "A branded confirmation with a calendar file, plus Google's own invite, so it shows up everywhere." },
    ],
  },
  {
    key: "grow",
    brief: "Instagram keyword replies, your own Meta, Google, and TikTok pixels, reviews you approve.",
    eyebrow: "Grow",
    title: "Turn comments into customers.",
    intro: "Instagram is where your buyers already are. Give a product a keyword and the rest is automatic.",
    art: { file: "grow.jpg", width: 1200, height: 800, alt: "A megaphone pointed at a rising bar chart with the tallest bar in orange" },
    features: [
      { title: "Instagram keyword auto-replies", body: "Someone DMs or comments \"guide\" and they get a branded product card with the link, in seconds. Works for downloads and booking calls alike.", pro: true },
      { title: "Your own pixels", body: "Connect your Meta, Google, and TikTok pixels. Every view, checkout, lead, and purchase fires on your storefront so your ads optimize on real buyers.", pro: true },
      { title: "Server-side Meta events", body: "Add a Conversions API token and purchases are sent server-to-server too, deduplicated against the pixel.", pro: true },
      { title: "Analytics that explain themselves", body: "Views, clicks per card, conversions, and where the traffic came from: Instagram, a story, a DM, a search." },
      { title: "Reviews from real buyers", body: "After the download, buyers rate it and leave a line. You approve what shows." },
      { title: "Marketing opt-in", body: "A checkbox at checkout builds your list with people who actually bought." },
    ],
  },
  {
    key: "design",
    brief: "Presets to start from, a full editor on Pro, and a live preview while you work.",
    eyebrow: "Design",
    title: "Every store looks like you.",
    intro: "Not a theme and two colors. Fonts, palette, layout, card styles, and a live preview while you work.",
    art: { file: "design.jpg", width: 1200, height: 800, alt: "A fanned paint-swatch deck, a ruler, and an orange pen over a blank phone mockup" },
    features: [
      { title: "Presets to start from", body: "Paper, Sunset, and more. Pick one and your store is already distinctive." },
      { title: "The full editor", body: "Two Google fonts, your palette, background image or gradient, list, grid, or hero layout. Watch it change live.", pro: true },
      { title: "Card styles per product", body: "Button, callout, or preview. Mix them on one store." },
      { title: "Preview while you write", body: "The product editor shows the storefront card and the product page as you type." },
      { title: "Remove visitmy.shop branding", body: "Your store, your name only.", pro: true },
    ],
  },
  {
    key: "deliver",
    brief: "Paid to your own Stripe, delivered in seconds, kept in a library your buyers can always find.",
    eyebrow: "Deliver",
    title: "Paid in seconds, delivered in seconds.",
    intro: "Money goes to your own Stripe. Files go to the buyer. Nothing waits on us.",
    art: { file: "deliver.jpg", width: 1200, height: 800, alt: "An open envelope with an orange document sliding out beside a padlock and a checkmark" },
    features: [
      { title: "Your own Stripe", body: "Connect your Stripe account and payouts go straight to you, on your schedule. We never hold your money." },
      { title: "Branded delivery emails", body: "A clean confirmation with download links, in your store's name." },
      { title: "A library for your buyers", body: "Everything they've bought, from every creator, behind one magic link at visitmy.shop/me. No passwords." },
      { title: "Secure download links", body: "Signed, rate-limited, and tied to the buyer. A leaked link can't be hammered." },
      { title: "Refunds handled", body: "Refund in Stripe and the download switches off on its own." },
      { title: "0% fee on Pro", body: `Basic keeps ${100 - PLANS[0].feePercent}% of every sale. Pro keeps all of it.` },
    ],
  },
];
