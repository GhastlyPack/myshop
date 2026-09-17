import { z } from "zod";

/**
 * Every external service has a dev fallback so the app runs locally with
 * nothing but Postgres. When the real keys land, set them and the adapters
 * switch over automatically (see lib/auth, lib/storage, lib/mailer, lib/payments).
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().default("postgres://localhost:5432/myshop"),
  DATABASE_DIRECT_URL: z.string().optional(),

  // Auth0 (creators). If unset in dev → dev bypass login at /dev/login.
  AUTH0_DOMAIN: z.string().optional(),
  AUTH0_CLIENT_ID: z.string().optional(),
  AUTH0_CLIENT_SECRET: z.string().optional(),
  AUTH0_SECRET: z.string().optional(),

  // Session signing for buyer magic links + dev auth. Any long random string.
  SESSION_SECRET: z.string().default("dev-only-secret-change-me-please-32chars"),

  // Storage. If AWS unset → local filesystem under .data/uploads.
  AWS_REGION: z.string().default("us-east-1"),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET_FILES: z.string().optional(), // private product files
  S3_BUCKET_PUBLIC: z.string().optional(), // thumbnails, avatars
  S3_PUBLIC_BASE_URL: z.string().optional(), // e.g. https://visitmyshop-public.s3.amazonaws.com
  // Storage alternative: Supabase Storage (private + public buckets, signed URLs). Used when AWS is unset.
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // Email. If unset → dev outbox at /dev/outbox.
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("visitmy.shop <hello@visitmy.shop>"),

  // Stripe platform account (Connect Standard). If unset → "not configured" UI.
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_CONNECT_CLIENT_ID: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(), // Connect endpoint (/api/webhooks/stripe)
  STRIPE_BILLING_WEBHOOK_SECRET: z.string().optional(), // platform-account subscription endpoint (/api/webhooks/billing)

  // PayPal Commerce Platform (partner). If unset → hidden.
  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  PAYPAL_PARTNER_ID: z.string().optional(),
  PAYPAL_ENV: z.enum(["sandbox", "live"]).default("sandbox"),

  // Meta Pixel + CAPI
  META_PIXEL_ID: z.string().optional(),
  GA_MEASUREMENT_ID: z.string().default("G-BQJ8RLRS8G"),
  GOOGLE_SITE_VERIFICATION: z.string().optional(), // Search Console HTML-tag verification token // Google Analytics 4; loaded in production only
  META_CAPI_TOKEN: z.string().optional(),

  // Instagram API with Instagram Login (keyword auto-replies). If unset → Settings shows "coming soon".
  INSTAGRAM_APP_ID: z.string().optional(),
  INSTAGRAM_APP_SECRET: z.string().optional(),
  INSTAGRAM_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
  // While the Meta app is pre-App-Review, only added testers can connect. false → beta: apply-only.
  INSTAGRAM_PUBLIC: z.enum(["true", "false"]).default("false"),

  // Comma-separated admin emails (bootstrap); admins can also be added from /admin/team
  ADMIN_EMAILS: z.string().default(""),
  // The one owner. Can't be removed; only the owner removes admins. Defaults to the first ADMIN_EMAILS entry.
  OWNER_EMAIL: z.string().optional(),
});

// Treat empty strings as unset (Vercel imports of .env.example leave blanks), and let
// Vercel's own URL stand in for APP_BASE_URL on previews when it isn't set explicitly.
const raw: Record<string, string | undefined> = {};
for (const [k, v] of Object.entries(process.env)) raw[k] = cleanEnvValue(k, v);

/** Trim, drop wrapping quotes, and forgive a pasted `KEY=` prefix. Empty → undefined. */
export function cleanEnvValue(key: string, v: string | undefined): string | undefined {
  if (v == null) return undefined;
  let s = v.trim();
  if (s.startsWith(`${key}=`)) s = s.slice(key.length + 1).trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1).trim();
  return s === "" ? undefined : s;
}
// The Auth0 Vercel integration writes `auth_AUTH0_*`; accept those as fallbacks.
for (const k of ["AUTH0_DOMAIN", "AUTH0_CLIENT_ID", "AUTH0_CLIENT_SECRET", "AUTH0_SECRET"] as const) {
  if (!raw[k] && raw[`auth_${k}`]) raw[k] = raw[`auth_${k}`];
}
if (!raw.APP_BASE_URL) {
  const vercelHost = raw.VERCEL_ENV === "production" ? raw.VERCEL_PROJECT_PRODUCTION_URL : raw.VERCEL_URL;
  if (vercelHost) raw.APP_BASE_URL = `https://${vercelHost}`;
}

const parsed = schema.safeParse(raw);
if (!parsed.success) {
  console.error("Invalid environment:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;

export const isProd = env.NODE_ENV === "production";
export const auth0Configured = Boolean(env.AUTH0_DOMAIN && env.AUTH0_CLIENT_ID && env.AUTH0_CLIENT_SECRET && env.AUTH0_SECRET);
export const s3Configured = Boolean(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.S3_BUCKET_FILES && env.S3_BUCKET_PUBLIC);
export const supabaseStorageConfigured = !s3Configured && Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
/** Which storage backend is active. */
export const storageDriver: "s3" | "supabase" | "local" = s3Configured ? "s3" : supabaseStorageConfigured ? "supabase" : "local";
export const resendConfigured = Boolean(env.RESEND_API_KEY);
export const stripeConfigured = Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_CONNECT_CLIENT_ID);
/** Our own subscription billing: checkout/portal need only Stripe; the billing webhook also needs its signing secret. */
export const billingConfigured = stripeConfigured && Boolean(env.STRIPE_BILLING_WEBHOOK_SECRET);
export const paypalConfigured = Boolean(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET);
export const instagramConfigured = Boolean(env.INSTAGRAM_APP_ID && env.INSTAGRAM_APP_SECRET && env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN);
export const instagramPublic = env.INSTAGRAM_PUBLIC === "true";
export const adminEmails = env.ADMIN_EMAILS.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
export const ownerEmail = (env.OWNER_EMAIL ?? adminEmails[0] ?? "").toLowerCase();

// In production without Auth0 nobody can sign in (the dev bypass is disabled there).
// Warn rather than throw so `next build` and preview deploys still succeed.
if (isProd && !auth0Configured && process.env.NEXT_PHASE !== "phase-production-build") {
  console.warn("[env] Auth0 is not configured; creator sign-in is disabled.");
}
