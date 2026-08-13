CREATE TABLE "blog_posts" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"content" jsonb DEFAULT '[]' NOT NULL,
	"meta_description" text,
	"hero_image_url" text,
	"category" text NOT NULL,
	"tags" jsonb DEFAULT '[]' NOT NULL,
	"author" text NOT NULL,
	"published_at" text,
	"published" boolean DEFAULT false NOT NULL,
	"spotlight_provider_slug" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "blog_posts_slug_idx" ON "blog_posts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "blog_posts_published_at_idx" ON "blog_posts" USING btree ("published", "published_at");--> statement-breakpoint
CREATE INDEX "blog_posts_category_idx" ON "blog_posts" USING btree ("category");
