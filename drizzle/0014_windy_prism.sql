CREATE TABLE "product_variants" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price_cents" integer DEFAULT 0 NOT NULL,
	"file_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entitlements" ADD COLUMN "allowed_file_ids" text[];--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "bumps" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "variant_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "variant_name" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "bumps" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "pay_what_you_want" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "min_price_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_variants_product_idx" ON "product_variants" USING btree ("product_id","position");