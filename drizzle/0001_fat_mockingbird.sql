ALTER TYPE "public"."user_role" ADD VALUE 'owner';--> statement-breakpoint
CREATE TABLE "admin_invites" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"invited_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_invites" ADD CONSTRAINT "admin_invites_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admin_invites_email_idx" ON "admin_invites" USING btree ("email");