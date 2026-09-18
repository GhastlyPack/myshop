CREATE TYPE "public"."booking_status" AS ENUM('confirmed', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."calendar_provider" AS ENUM('google');--> statement-breakpoint
ALTER TYPE "public"."product_type" ADD VALUE 'booking';--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"product_id" text NOT NULL,
	"order_id" text,
	"buyer_email" text NOT NULL,
	"buyer_name" text NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"timezone" text NOT NULL,
	"status" "booking_status" DEFAULT 'confirmed' NOT NULL,
	"google_event_id" text,
	"meeting_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"provider" "calendar_provider" DEFAULT 'google' NOT NULL,
	"email" text NOT NULL,
	"calendar_id" text DEFAULT 'primary' NOT NULL,
	"access_token_enc" text NOT NULL,
	"refresh_token_enc" text NOT NULL,
	"token_expires_at" timestamp with time zone NOT NULL,
	"scope" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "duration_minutes" integer;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "booking" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_connections" ADD CONSTRAINT "calendar_connections_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookings_store_start_idx" ON "bookings" USING btree ("store_id","start_at");--> statement-breakpoint
CREATE INDEX "bookings_order_idx" ON "bookings" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_connections_store_idx" ON "calendar_connections" USING btree ("store_id");