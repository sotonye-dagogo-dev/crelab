import { createClient } from "next-sanity";
import { createImageUrlBuilder } from "@sanity/image-url";
import type { SanityImageSource, SanityClientLike } from "@sanity/image-url";
import type { IBlogPost, ICreatorSpotlight, BlogCategory } from "@/types/blog";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2024-01-01";

function getClient() {
  if (!projectId || !dataset) {
    throw new Error("Missing Sanity project ID or dataset");
  }
  return createClient({ projectId, dataset, apiVersion, useCdn: true });
}

let _builder: ReturnType<typeof createImageUrlBuilder> | null = null;

function getBuilder() {
  if (!_builder) {
    _builder = createImageUrlBuilder({
      projectId: projectId ?? "",
      dataset: dataset ?? "",
    } as unknown as SanityClientLike);
  }
  return _builder;
}

export function urlFor(source: SanityImageSource) {
  return getBuilder().image(source);
}

const BLOG_FIELDS = `{
  _id,
  title,
  slug,
  content,
  metaDescription,
  heroImage,
  category,
  tags,
  author,
  publishedAt,
  spotlightProviderSlug
}`;

const SPOTLIGHT_FIELDS = `{
  _id,
  title,
  slug,
  providerSlug,
  introText,
  body,
  publishedAt
}`;

export async function getAllPosts(category?: BlogCategory | "all"): Promise<IBlogPost[]> {
  const client = getClient();
  const filter = category && category !== "all"
    ? `*[_type == "blogPost" && defined(publishedAt) && category == $category] | order(publishedAt desc)`
    : `*[_type == "blogPost" && defined(publishedAt)] | order(publishedAt desc)`;

  const params: Record<string, string | undefined> = {};
  if (category && category !== "all") params.category = category;

  return client.fetch(`${filter} ${BLOG_FIELDS}`, params);
}

export async function getPostBySlug(slug: string): Promise<IBlogPost | null> {
  const client = getClient();
  return client.fetch(
    `*[_type == "blogPost" && slug.current == $slug][0] ${BLOG_FIELDS}`,
    { slug },
  );
}

export async function getAllCreatorSpotlights(): Promise<ICreatorSpotlight[]> {
  const client = getClient();
  return client.fetch(
    `*[_type == "creatorSpotlight" && defined(publishedAt)] | order(publishedAt desc) ${SPOTLIGHT_FIELDS}`,
  );
}

export async function getSpotlightBySlug(slug: string): Promise<ICreatorSpotlight | null> {
  const client = getClient();
  return client.fetch(
    `*[_type == "creatorSpotlight" && slug.current == $slug][0] ${SPOTLIGHT_FIELDS}`,
    { slug },
  );
}

export async function getRelatedPosts(
  category: string,
  currentSlug: string,
  limit = 3,
): Promise<IBlogPost[]> {
  const client = getClient();
  return client.fetch(
    `*[_type == "blogPost" && defined(publishedAt) && category == $category && slug.current != $currentSlug] | order(publishedAt desc) [0...$limit] ${BLOG_FIELDS}`,
    { category, currentSlug, limit },
  );
}

export async function getAllPostSlugs(): Promise<{ slug: string }[]> {
  const client = getClient();
  return client.fetch(
    `*[_type == "blogPost" && defined(publishedAt)] {"slug": slug.current}`,
  );
}

export async function getAllSpotlightSlugs(): Promise<{ slug: string }[]> {
  const client = getClient();
  return client.fetch(
    `*[_type == "creatorSpotlight" && defined(publishedAt)] {"slug": slug.current}`,
  );
}
