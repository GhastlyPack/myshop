ALTER TABLE "subscriptions" ALTER COLUMN "plan" SET DEFAULT 'basic';--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "interval" text DEFAULT 'month' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "stripe_subscription_id" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "stripe_price_lookup_key" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "cancel_at_period_end" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "trial_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "grandfathered" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_user_id_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscriptions_customer_idx" ON "subscriptions" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "subscriptions_sub_idx" ON "subscriptions" USING btree ("stripe_subscription_id");--> statement-breakpoint
-- Grandfather every existing user onto comped Pro (no trial, no card). Idempotent.
INSERT INTO "subscriptions" ("id", "user_id", "plan", "interval", "status", "grandfathered", "created_at", "updated_at")
SELECT 'sub_' || substr(md5(random()::text || clock_timestamp()::text || u."id"), 1, 16), u."id", 'pro', 'month', 'active', true, now(), now()
FROM "users" u
WHERE NOT EXISTS (SELECT 1 FROM "subscriptions" s WHERE s."user_id" = u."id");
