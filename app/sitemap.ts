import { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { providers } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

async function getBlogSlugs(): Promise<{ slug: string }[]> {
  try {
    if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) return [];
    const { getAllPostSlugs } = await import("@/lib/sanity");
    return await getAllPostSlugs();
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://crelab.ng";

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/explore`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
  ];

  let categoryPages: MetadataRoute.Sitemap = [];
  try {
    const { PlatformConfigService } = await import("@/services/PlatformConfigService");
    const config = await PlatformConfigService.getCached();
    categoryPages = config.categories
      .filter((c) => c.active)
      .map((c) => ({
        url: `${baseUrl}/${c.slug}`,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: 0.7,
      }));
  } catch {
    categoryPages = [];
  }

  let profilePages: MetadataRoute.Sitemap = [];
  try {
    const rows = await db
      .select({ id: providers.id, displayName: providers.displayName, updatedAt: providers.updatedAt })
      .from(providers)
      .where(eq(providers.active, true));
    profilePages = rows.map((row) => {
      const slug = `${row.displayName.toLowerCase().replace(/\s+/g, "-")}-${row.id.slice(0, 8)}`;
      return {
        url: `${baseUrl}/profile/${slug}`,
        lastModified: row.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      };
    });
  } catch {
    profilePages = [];
  }

  let blogSlugs: MetadataRoute.Sitemap = [];
  try {
    const slugs = await getBlogSlugs();
    blogSlugs = slugs.map((s) => ({
      url: `${baseUrl}/blog/${s.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch {
    blogSlugs = [];
  }

  return [...staticPages, ...categoryPages, ...profilePages, ...blogSlugs];
}
