CREATE TABLE "instagram_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"ig_user_id" text NOT NULL,
	"username" text NOT NULL,
	"token_enc" text NOT NULL,
	"token_expires_at" timestamp with time zone NOT NULL,
	"public_reply" boolean DEFAULT true NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "instagram_replies" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"product_id" text,
	"kind" text NOT NULL,
	"source_id" text NOT NULL,
	"from_ig_user_id" text,
	"from_username" text,
	"keyword" text,
	"ok" boolean DEFAULT true NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "instagram_accounts" ADD CONSTRAINT "instagram_accounts_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instagram_replies" ADD CONSTRAINT "instagram_replies_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instagram_replies" ADD CONSTRAINT "instagram_replies_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "instagram_accounts_store_idx" ON "instagram_accounts" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "instagram_accounts_ig_user_idx" ON "instagram_accounts" USING btree ("ig_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "instagram_replies_source_idx" ON "instagram_replies" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "instagram_replies_store_idx" ON "instagram_replies" USING btree ("store_id","created_at");