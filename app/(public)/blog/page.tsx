import { BlogPostService } from "@/services/BlogPostService";
import { BlogPageClient } from "./BlogPageClient";
import { PlatformConfigService } from "@/services/PlatformConfigService";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { PlatformConfigService } = await import("@/services/PlatformConfigService");
  const { DEFAULT_CONFIG } = await import("@/config/platform.config");
  const { buildSeoMetadata } = await import("@/lib/seo");
  let config = DEFAULT_CONFIG;
  try {
    config = await PlatformConfigService.getCached();
  } catch {}
  return buildSeoMetadata(config, {
    title: "Blog",
    description:
      "Hiring guides, pricing tips, and spotlights on the creators making Nigeria's best content.",
    path: "/blog",
  });
}

export default async function BlogPage() {
  let blogConfig: import("@/types").IBlogConfig | undefined;
  try {
    const config = await PlatformConfigService.getCached();
    blogConfig = config.blogConfig;
  } catch {}

  const posts = await BlogPostService.list();
  return <BlogPageClient posts={posts} blogConfig={blogConfig} />;
}
