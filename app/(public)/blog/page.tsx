import { getAllPosts } from "@/lib/sanity";
import { BlogPageClient } from "./BlogPageClient";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { DEFAULT_CONFIG } = await import("@/config/platform.config");
  return {
    title: `Blog | ${DEFAULT_CONFIG.name}`,
    description:
      "Hiring guides, pricing tips, and spotlights on the creators making Nigeria's best content.",
  };
}

export default async function BlogPage() {
  try {
    const posts = await getAllPosts();
    return <BlogPageClient posts={posts} />;
  } catch {
    return <BlogPageClient posts={[]} />;
  }
}
