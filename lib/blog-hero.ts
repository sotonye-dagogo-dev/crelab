import type { IBlogPost } from "@/types/blog";
import { urlFor } from "@/lib/sanity";
import { resolveAbsoluteUrl } from "@/lib/url";

/**
 * Resolves a blog post hero image to a renderable absolute URL. Admin-managed
 * (DB) posts store the image as a plain URL in `asset._ref`/`asset.url`, while
 * Sanity posts carry an image reference that must go through `urlFor`. Falls
 * back to an empty string so callers can render a gradient instead.
 */
export function getPostHeroUrl(post: IBlogPost, width = 1200, height = 630): string {
  if (!post.heroImage) return "";
  const asset = (post.heroImage as unknown as { asset?: { url?: string; _ref?: string } }).asset;
  const rawUrl = asset?.url ?? asset?._ref ?? "";
  if (!rawUrl) return "";
  // Sanity image refs look like "image-<hash>-<w>x<h>-<format>". URL refs are
  // plain http(s)/absolute paths — resolve those directly without urlFor.
  if (rawUrl.startsWith("image-") && typeof urlFor === "function") {
    try {
      return urlFor(post.heroImage).width(width).height(height).url();
    } catch {
      return "";
    }
  }
  return resolveAbsoluteUrl(rawUrl);
}
