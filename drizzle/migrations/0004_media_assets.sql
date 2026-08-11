CREATE TYPE "public"."media_asset_status" AS ENUM('ACTIVE', 'DELETED');--> statement-breakpoint
CREATE TABLE "media_assets" (
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
CREATE INDEX "media_assets_owner_id_idx" ON "media_assets" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "media_assets_status_created_at_idx" ON "media_assets" USING btree ("status", "created_at");--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE set null;
