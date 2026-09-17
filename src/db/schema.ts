import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import type { Theme } from "@/lib/theme";

// ---------- shared helpers ----------
const id = () => text("id").primaryKey();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

// ---------- enums ----------
export const userRole = pgEnum("user_role", ["creator", "admin", "owner"]);
export const productType = pgEnum("product_type", ["download", "link"]);
export const productStatus = pgEnum("product_status", ["draft", "published"]);
export const cardStyle = pgEnum("card_style", ["button", "callout", "preview"]);
export const paymentProvider = pgEnum("payment_provider", ["stripe", "paypal"]);
export const orderProvider = pgEnum("order_provider", ["free", "stripe", "paypal"]);
export const orderStatus = pgEnum("order_status", ["pending", "paid", "refunded", "failed"]);
export const eventType = pgEnum("event_type", [
  "view", // storefront view
  "product_view",
  "click", // card click
  "checkout_start",
  "lead", // free product claimed
  "purchase",
  "download",
]);

// ---------- types stored as jsonb ----------
export type SocialLinks = Partial<
  Record<"instagram" | "tiktok" | "youtube" | "x" | "threads" | "linkedin" | "website" | "email", string>
>;

export type CustomField = {
  id: string;
  label: string;
  type: "text" | "phone" | "select" | "checkbox" | "multiselect";
  required: boolean;
  options?: string[];
};

export type TrafficSource = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  src?: string; // our own short param, e.g. ?src=ig
  referrer?: string;
};

// ---------- tables ----------
export const users = pgTable(
  "users",
  {
    id: id(),
    auth0Sub: text("auth0_sub").notNull(),
    email: text("email").notNull(),
    name: text("name"),
    role: userRole("role").notNull().default("creator"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("users_auth0_sub_idx").on(t.auth0Sub), uniqueIndex("users_email_idx").on(t.email)],
);

export const stores = pgTable(
  "stores",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    username: text("username").notNull(), // stored lowercase
    displayName: text("display_name").notNull(),
    bio: text("bio"),
    avatarKey: text("avatar_key"),
    socials: jsonb("socials").$type<SocialLinks>().notNull().default({}),
    theme: jsonb("theme").$type<Theme>().notNull().default(sql`'{}'::jsonb`),
    currency: text("currency").notNull().default("usd"),
    published: boolean("published").notNull().default(true),
    // platform billing — unused until Commas / app fees land
    platformFeeBps: integer("platform_fee_bps").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("stores_username_idx").on(t.username), uniqueIndex("stores_user_id_idx").on(t.userId)],
);

export const sections = pgTable(
  "sections",
  {
    id: id(),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("sections_store_idx").on(t.storeId)],
);

export const products = pgTable(
  "products",
  {
    id: id(),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    sectionId: text("section_id").references(() => sections.id, { onDelete: "set null" }),
    slug: text("slug").notNull(),
    type: productType("type").notNull().default("download"),
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    description: text("description"), // markdown
    thumbnailKey: text("thumbnail_key"),
    bannerKey: text("banner_key"),
    cardStyle: cardStyle("card_style").notNull().default("callout"),
    buttonText: text("button_text").notNull().default("Get it"),
    priceCents: integer("price_cents").notNull().default(0), // 0 = free
    currency: text("currency").notNull().default("usd"),
    listed: boolean("listed").notNull().default(true), // shown on storefront
    fields: jsonb("fields").$type<CustomField[]>().notNull().default([]),
    marketingOptIn: boolean("marketing_opt_in").notNull().default(true), // show the checkbox
    dmKeyword: text("dm_keyword"),
    /** Custom auto-reply DM. Placeholders: {{link}} {{title}} {{name}}. Null = default text. */
    dmReplyText: text("dm_reply_text"),
    confirmationSubject: text("confirmation_subject"),
    confirmationBody: text("confirmation_body"),
    status: productStatus("status").notNull().default("draft"),
    position: integer("position").notNull().default(0),
    /** Limited quantity: null = unlimited. `quantitySold` counts paid orders (main + bump) and is never reserved ahead of payment. */
    quantityLimit: integer("quantity_limit"),
    quantitySold: integer("quantity_sold").notNull().default(0),
    /** Order bump: another paid product from the same store offered as a one-click add-on at checkout. */
    bumpProductId: text("bump_product_id").references((): AnyPgColumn => products.id, { onDelete: "set null" }),
    bumpHeadline: text("bump_headline"),
    bumpDiscountPercent: integer("bump_discount_percent").notNull().default(0),
    /** Archived (soft-deleted). Hidden everywhere, but orders, entitlements and files stay so buyers keep access. */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("products_store_slug_idx").on(t.storeId, t.slug), index("products_store_idx").on(t.storeId)],
);

export const productFiles = pgTable(
  "product_files",
  {
    id: id(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    filename: text("filename").notNull(),
    bytes: integer("bytes").notNull().default(0),
    mime: text("mime"),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("product_files_product_idx").on(t.productId)],
);

export const productLinks = pgTable(
  "product_links",
  {
    id: id(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    label: text("label").notNull(),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("product_links_product_idx").on(t.productId)],
);

/** Per-product discount codes. Exactly one of percentOff / amountOffCents is set. */
export const discountCodes = pgTable(
  "discount_codes",
  {
    id: id(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    code: text("code").notNull(), // stored uppercase
    percentOff: integer("percent_off"), // 1..100
    amountOffCents: integer("amount_off_cents"),
    maxUses: integer("max_uses"),
    uses: integer("uses").notNull().default(0), // incremented when the order is paid
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("discount_codes_product_code_idx").on(t.productId, t.code), index("discount_codes_product_idx").on(t.productId)],
);

export const paymentAccounts = pgTable(
  "payment_accounts",
  {
    id: id(),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    provider: paymentProvider("provider").notNull(),
    externalId: text("external_id").notNull(), // acct_... or PayPal merchant id
    chargesEnabled: boolean("charges_enabled").notNull().default(false),
    details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("payment_accounts_store_provider_idx").on(t.storeId, t.provider)],
);

export const orders = pgTable(
  "orders",
  {
    id: id(),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    buyerEmail: text("buyer_email").notNull(), // lowercase
    buyerName: text("buyer_name").notNull(),
    customFields: jsonb("custom_fields").$type<Record<string, string | string[] | boolean>>().notNull().default({}),
    marketingOptIn: boolean("marketing_opt_in").notNull().default(false),
    /** Total charged: product price − discount + bump. Income / analytics sum this column. */
    amountCents: integer("amount_cents").notNull().default(0),
    currency: text("currency").notNull().default("usd"),
    platformFeeCents: integer("platform_fee_cents").notNull().default(0),
    discountCode: text("discount_code"),
    discountCents: integer("discount_cents").notNull().default(0),
    bumpProductId: text("bump_product_id").references(() => products.id, { onDelete: "set null" }),
    bumpCents: integer("bump_cents").notNull().default(0),
    provider: orderProvider("provider").notNull().default("free"),
    providerRef: text("provider_ref"), // checkout session / payment intent / paypal order id
    status: orderStatus("status").notNull().default("pending"),
    source: jsonb("source").$type<TrafficSource>().notNull().default({}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("orders_store_idx").on(t.storeId, t.createdAt),
    index("orders_product_idx").on(t.productId),
    index("orders_email_idx").on(t.buyerEmail),
    uniqueIndex("orders_provider_ref_idx").on(t.providerRef),
  ],
);

export const entitlements = pgTable(
  "entitlements",
  {
    id: id(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    buyerEmail: text("buyer_email").notNull(),
    token: text("token").notNull(), // used in /d/[token]
    revoked: boolean("revoked").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("entitlements_token_idx").on(t.token), index("entitlements_email_idx").on(t.buyerEmail)],
);

export const downloads = pgTable(
  "downloads",
  {
    id: id(),
    entitlementId: text("entitlement_id")
      .notNull()
      .references(() => entitlements.id, { onDelete: "cascade" }),
    fileId: text("file_id").references(() => productFiles.id, { onDelete: "set null" }),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
  },
  (t) => [index("downloads_entitlement_idx").on(t.entitlementId)],
);

export const reviews = pgTable(
  "reviews",
  {
    id: id(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(), // 1..5
    quote: text("quote"),
    reviewerName: text("reviewer_name"),
    approved: boolean("approved").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("reviews_order_idx").on(t.orderId), index("reviews_product_idx").on(t.productId)],
);

export const events = pgTable(
  "events",
  {
    id: id(),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    productId: text("product_id").references(() => products.id, { onDelete: "cascade" }),
    type: eventType("type").notNull(),
    sessionId: text("session_id"),
    source: jsonb("source").$type<TrafficSource>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index("events_store_time_idx").on(t.storeId, t.createdAt), index("events_product_idx").on(t.productId)],
);

export const buyerSessions = pgTable(
  "buyer_sessions",
  {
    id: id(),
    email: text("email").notNull(),
    tokenHash: text("token_hash").notNull(),
    consumed: boolean("consumed").notNull().default(false),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("buyer_sessions_token_idx").on(t.tokenHash)],
);

/** A creator's connected Instagram professional account (Instagram API with Instagram Login). */
export const instagramAccounts = pgTable(
  "instagram_accounts",
  {
    id: id(),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    igUserId: text("ig_user_id").notNull(),
    username: text("username").notNull(),
    /** Long-lived user token, AES-GCM encrypted with SESSION_SECRET (see lib/instagram). */
    tokenEnc: text("token_enc").notNull(),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }).notNull(),
    /** Also post a short public reply ("Sent you a DM") under the comment. */
    publicReply: boolean("public_reply").notNull().default(true),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("instagram_accounts_store_idx").on(t.storeId), uniqueIndex("instagram_accounts_ig_user_idx").on(t.igUserId)],
);

/** Every auto-reply we sent (idempotency by comment/message id + analytics). */
export const instagramReplies = pgTable(
  "instagram_replies",
  {
    id: id(),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    productId: text("product_id").references(() => products.id, { onDelete: "set null" }),
    kind: text("kind").notNull(), // "comment" | "dm"
    sourceId: text("source_id").notNull(), // comment id or message id
    fromIgUserId: text("from_ig_user_id"),
    fromUsername: text("from_username"),
    keyword: text("keyword"),
    ok: boolean("ok").notNull().default(true),
    error: text("error"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("instagram_replies_source_idx").on(t.sourceId), index("instagram_replies_store_idx").on(t.storeId, t.createdAt)],
);

/** Raw Instagram webhook receipts (summarized), so "did Meta even call us?" has an answer. */
export const instagramEvents = pgTable(
  "instagram_events",
  {
    id: id(),
    igUserId: text("ig_user_id"),
    field: text("field").notNull(), // "comments" | "messages" | "other" | "none"
    summary: jsonb("summary").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index("instagram_events_time_idx").on(t.createdAt)],
);

/** Admin access granted to an email that hasn't signed in yet; applied on first login. */
export const adminInvites = pgTable(
  "admin_invites",
  {
    id: id(),
    email: text("email").notNull(), // lowercase
    invitedBy: text("invited_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("admin_invites_email_idx").on(t.email)],
);

// Unused until our own billing (Commas / Stripe app fees) lands.
export const subscriptions = pgTable("subscriptions", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  plan: text("plan").notNull().default("starter"),
  status: text("status").notNull().default("trialing"),
  provider: text("provider"),
  externalId: text("external_id"),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const jobs = pgTable(
  "jobs",
  {
    id: id(),
    type: text("type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    runAt: timestamp("run_at", { withTimezone: true }).notNull().defaultNow(),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    done: boolean("done").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("jobs_pending_idx").on(t.done, t.runAt)],
);

// ---------- inferred types ----------
export type User = typeof users.$inferSelect;
export type Store = typeof stores.$inferSelect;
export type Section = typeof sections.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductFile = typeof productFiles.$inferSelect;
export type ProductLink = typeof productLinks.$inferSelect;
export type DiscountCode = typeof discountCodes.$inferSelect;
export type PaymentAccount = typeof paymentAccounts.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Entitlement = typeof entitlements.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Event = typeof events.$inferSelect;
export type InstagramAccount = typeof instagramAccounts.$inferSelect;
export type InstagramReply = typeof instagramReplies.$inferSelect;
