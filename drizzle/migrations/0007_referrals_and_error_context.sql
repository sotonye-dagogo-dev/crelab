CREATE TABLE "referral_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "referral_codes_code_idx" ON "referral_codes" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "referral_codes_user_id_idx" ON "referral_codes" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "referral_events" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"invitee_id" text NOT NULL,
	"referrer_id" text NOT NULL,
	"code" text,
	"degree" integer DEFAULT 1 NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"source" text DEFAULT 'referral' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "referral_events_unique" ON "referral_events" USING btree ("user_id","invitee_id","degree","source");--> statement-breakpoint
CREATE INDEX "referral_events_invitee_idx" ON "referral_events" USING btree ("invitee_id");--> statement-breakpoint
CREATE INDEX "referral_events_user_idx" ON "referral_events" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "referral_events" ADD CONSTRAINT "referral_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_events" ADD CONSTRAINT "referral_events_invitee_id_user_id_fk" FOREIGN KEY ("invitee_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_events" ADD CONSTRAINT "referral_events_referrer_id_user_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bug_reports" ADD COLUMN "error_context" jsonb;--> statement-breakpoint
CREATE TYPE "public"."webinar_status" AS ENUM('UPCOMING', 'LIVE', 'CANCELLED', 'ENDED');--> statement-breakpoint
CREATE TYPE "public"."webinar_registration_status" AS ENUM('REGISTERED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "webinars" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"description" text,
	"cover_url" text,
	"status" "public"."webinar_status" DEFAULT 'UPCOMING' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"duration_minutes" integer,
	"location_note" text,
	"cta_label" text,
	"cta_href" text,
	"recording_url" text,
	"content_blocks" jsonb DEFAULT '[]'::jsonb,
	"meta_title" text,
	"meta_description" text,
	"order_index" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "webinars_slug_idx" ON "webinars" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "webinars_status_idx" ON "webinars" USING btree ("status","starts_at");--> statement-breakpoint
CREATE TABLE "webinar_registrations" (
	"id" text PRIMARY KEY NOT NULL,
	"webinar_id" text NOT NULL,
	"user_id" text,
	"email" text NOT NULL,
	"email_key" text NOT NULL,
	"name" text,
	"consent_marketing" boolean DEFAULT false NOT NULL,
	"status" "public"."webinar_registration_status" DEFAULT 'REGISTERED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "webinar_registrations_email_idx" ON "webinar_registrations" USING btree ("webinar_id","email_key");--> statement-breakpoint
CREATE UNIQUE INDEX "webinar_registrations_user_idx" ON "webinar_registrations" USING btree ("webinar_id","user_id");--> statement-breakpoint
CREATE INDEX "webinar_registrations_status_idx" ON "webinar_registrations" USING btree ("webinar_id","status");--> statement-breakpoint
ALTER TABLE "webinar_registrations" ADD CONSTRAINT "webinar_registrations_webinar_id_webinars_id_fk" FOREIGN KEY ("webinar_id") REFERENCES "public"."webinars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar_registrations" ADD CONSTRAINT "webinar_registrations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
