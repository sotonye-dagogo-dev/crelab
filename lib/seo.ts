import type { Metadata } from "next";
import type { IPlatformConfig } from "@/types";
import { resolveAbsoluteUrl } from "@/lib/url";

export interface SeoOptions {
  /** Page title. If it does not include the platform name it is suffixed with " | {name}" */
  title?: string;
  description?: string;
  /** Path for canonical URL, e.g. "/explore" */
  path?: string;
  /** Absolute URL of a custom og:image (defaults to the platform logo) */
  ogImage?: string;
  ogType?: "website" | "article" | "profile";
  keywords?: string[];
  noindex?: boolean;
}

/**
 * Builds Next.js Metadata from platform config so every page's meta tags are
 * config-driven (name, tagline, and the configured logo as the Open Graph /
 * Twitter card image). Relative logo paths are resolved to absolute URLs.
 */
export function buildSeoMetadata(
  config: Pick<IPlatformConfig, "name" | "tagline" | "logoPath">,
  options: SeoOptions = {},
): Metadata {
  const { title, description, path = "/", ogImage, ogType = "website", keywords, noindex } = options;

  const siteName = config.name;
  const finalTitle = title
    ? title.includes(siteName)
      ? title
      : `${title} | ${siteName}`
    : siteName;
  const finalDescription = description ?? config.tagline;
  const imageUrl = ogImage ?? resolveAbsoluteUrl(config.logoPath);
  const url = path ? resolveAbsoluteUrl(path) : resolveAbsoluteUrl("/");

  return {
    title: finalTitle,
    description: finalDescription,
    applicationName: siteName,
    ...(keywords?.length ? { keywords: keywords.join(", ") } : {}),
    alternates: { canonical: url },
    openGraph: {
      title: finalTitle,
      description: finalDescription,
      url,
      siteName,
      type: ogType,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: siteName }],
    },
    twitter: {
      card: "summary_large_image",
      title: finalTitle,
      description: finalDescription,
      images: [imageUrl],
    },
    robots: noindex
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}
