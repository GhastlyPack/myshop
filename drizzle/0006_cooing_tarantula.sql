CREATE TABLE "instagram_events" (
	"id" text PRIMARY KEY NOT NULL,
	"ig_user_id" text,
	"field" text NOT NULL,
	"summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "instagram_events_time_idx" ON "instagram_events" USING btree ("created_at");