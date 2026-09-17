CREATE TABLE "instagram_beta_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"ig_username" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "instagram_beta_requests" ADD CONSTRAINT "instagram_beta_requests_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "instagram_beta_store_idx" ON "instagram_beta_requests" USING btree ("store_id");