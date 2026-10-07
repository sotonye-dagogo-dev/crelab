-- Idempotent close-out migration (generated 2026-10-07 via `npx drizzle-kit generate`,
-- then hardened with IF NOT EXISTS guards).
-- Covers all schema drift since snapshot 0002: about_page, how_it_works_page,
-- media_assets, blog_posts, referral_codes, referral_events, webinars,
-- webinar_registrations, bug_reports columns (reporter_*, screenshot_urls,
-- error_context) + new enums.
-- Safe to apply on BOTH a fresh DB and the live DB where 0004/0005/0006-style
-- objects were previously applied by hand (Session 2026-08-19): every
-- statement is a no-op if its object already exists.
DO $$ BEGIN CREATE TYPE "public"."media_asset_status" AS ENUM('ACTIVE', 'DELETED'); EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "public"."webinar_registration_status" AS ENUM('REGISTERED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "public"."webinar_status" AS ENUM('UPCOMING', 'LIVE', 'CANCELLED', 'ENDED'); EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "about_page" (
	"id" text PRIMARY KEY NOT NULL,
	"hero_title" text NOT NULL,
	"hero_subtitle" text,
	"sections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"quick_links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"meta_title" text,
	"meta_description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "blog_posts" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"content" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"meta_description" text,
	"hero_image_url" text,
	"category" text NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"author" text NOT NULL,
	"published_at" text,
	"published" boolean DEFAULT false NOT NULL,
	"spotlight_provider_slug" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "how_it_works_page" (
	"id" text PRIMARY KEY NOT NULL,
	"hero_title" text NOT NULL,
	"hero_subtitle" text,
	"sections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sandboxes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"faqs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"meta_title" text,
	"meta_description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "media_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"cloud_name" text NOT NULL,
	"resource_type" text NOT NULL,
	"url" text NOT NULL,
	"thumbnail_url" text,
	"mime_type" text,
	"owner_id" text,
	"status" "media_asset_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "referral_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "referral_events" (
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
CREATE TABLE IF NOT EXISTS "webinar_registrations" (
	"id" text PRIMARY KEY NOT NULL,
	"webinar_id" text NOT NULL,
	"user_id" text,
	"email" text NOT NULL,
	"email_key" text NOT NULL,
	"name" text,
	"consent_marketing" boolean DEFAULT false NOT NULL,
	"status" "webinar_registration_status" DEFAULT 'REGISTERED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "webinars" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"description" text,
	"cover_url" text,
	"status" "webinar_status" DEFAULT 'UPCOMING' NOT NULL,
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
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webinars_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "bug_reports" ADD COLUMN IF NOT EXISTS "reporter_email" text;--> statement-breakpoint
ALTER TABLE "bug_reports" ADD COLUMN IF NOT EXISTS "reporter_name" text;--> statement-breakpoint
ALTER TABLE "bug_reports" ADD COLUMN IF NOT EXISTS "screenshot_urls" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "bug_reports" ADD COLUMN IF NOT EXISTS "error_context" jsonb;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "referral_events" ADD CONSTRAINT "referral_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "referral_events" ADD CONSTRAINT "referral_events_invitee_id_user_id_fk" FOREIGN KEY ("invitee_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "referral_events" ADD CONSTRAINT "referral_events_referrer_id_user_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "webinar_registrations" ADD CONSTRAINT "webinar_registrations_webinar_id_webinars_id_fk" FOREIGN KEY ("webinar_id") REFERENCES "public"."webinars"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "webinar_registrations" ADD CONSTRAINT "webinar_registrations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "referral_codes_code_idx" ON "referral_codes" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "referral_codes_user_id_idx" ON "referral_codes" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "referral_events_unique" ON "referral_events" USING btree ("user_id","invitee_id","degree","source");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "referral_events_invitee_idx" ON "referral_events" USING btree ("invitee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "referral_events_user_idx" ON "referral_events" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "webinar_registrations_email_idx" ON "webinar_registrations" USING btree ("webinar_id","email_key");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "webinar_registrations_user_idx" ON "webinar_registrations" USING btree ("webinar_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webinar_registrations_status_idx" ON "webinar_registrations" USING btree ("webinar_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "webinars_slug_idx" ON "webinars" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webinars_status_idx" ON "webinars" USING btree ("status","starts_at");
