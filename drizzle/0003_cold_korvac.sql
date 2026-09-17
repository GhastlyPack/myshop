CREATE TABLE "discount_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"code" text NOT NULL,
	"percent_off" integer,
	"amount_off_cents" integer,
	"max_uses" integer,
	"uses" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "discount_code" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "discount_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "bump_product_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "bump_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "quantity_limit" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "quantity_sold" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "bump_product_id" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "bump_headline" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "bump_discount_percent" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "discount_codes" ADD CONSTRAINT "discount_codes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "discount_codes_product_code_idx" ON "discount_codes" USING btree ("product_id","code");--> statement-breakpoint
CREATE INDEX "discount_codes_product_idx" ON "discount_codes" USING btree ("product_id");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_bump_product_id_products_id_fk" FOREIGN KEY ("bump_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_bump_product_id_products_id_fk" FOREIGN KEY ("bump_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;