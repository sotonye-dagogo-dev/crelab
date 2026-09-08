ALTER TABLE "bug_reports" ADD COLUMN "reporter_email" text;--> statement-breakpoint
ALTER TABLE "bug_reports" ADD COLUMN "reporter_name" text;--> statement-breakpoint
ALTER TABLE "bug_reports" ADD COLUMN "screenshot_urls" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
