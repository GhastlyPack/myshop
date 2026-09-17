ALTER TABLE "products" ADD COLUMN "previous_slugs" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "about" text;