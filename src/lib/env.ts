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

  // Email. If unset → dev outbox at /dev/outbox.
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("visitmy.shop <hello@visitmy.shop>"),

  // Stripe platform account (Connect Standard). If unset → "not configured" UI.
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_CONNECT_CLIENT_ID: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // PayPal Commerce Platform (partner). If unset → hidden.
  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  PAYPAL_PARTNER_ID: z.string().optional(),
  PAYPAL_ENV: z.enum(["sandbox", "live"]).default("sandbox"),

  // Meta Pixel + CAPI
  META_PIXEL_ID: z.string().optional(),
  META_CAPI_TOKEN: z.string().optional(),

  // Comma-separated admin emails
  ADMIN_EMAILS: z.string().default(""),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;

export const isProd = env.NODE_ENV === "production";
export const auth0Configured = Boolean(env.AUTH0_DOMAIN && env.AUTH0_CLIENT_ID && env.AUTH0_CLIENT_SECRET && env.AUTH0_SECRET);
export const s3Configured = Boolean(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.S3_BUCKET_FILES && env.S3_BUCKET_PUBLIC);
export const resendConfigured = Boolean(env.RESEND_API_KEY);
export const stripeConfigured = Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_CONNECT_CLIENT_ID);
export const paypalConfigured = Boolean(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET);
export const adminEmails = env.ADMIN_EMAILS.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

// In production without Auth0 nobody can sign in (the dev bypass is disabled there).
// Warn rather than throw so `next build` and preview deploys still succeed.
if (isProd && !auth0Configured && process.env.NEXT_PHASE !== "phase-production-build") {
  console.warn("[env] Auth0 is not configured; creator sign-in is disabled.");
}
