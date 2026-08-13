import { db } from "@/lib/db";
import { blogPosts } from "@/drizzle/schema";
import { desc, eq, and, ne } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import type { IBlogPost, BlogCategory } from "@/types/blog";
import {
  getFallbackPosts,
  getFallbackPostBySlug,
  getFallbackRelatedPosts,
  getFallbackPostSlugs,
} from "@/lib/blog-fallback";
import type { EmailTemplateBlock } from "@/types";

export interface BlogPostInput {
  title: string;
  slug: string;
  content: EmailTemplateBlock[];
  metaDescription?: string;
  heroImageUrl?: string | null;
  category: BlogCategory;
  tags?: string[];
  author: string;
  published: boolean;
  spotlightProviderSlug?: string;
}

interface BlogRow {
  id: string;
  title: string;
  slug: string;
  content: unknown;
  metaDescription: string | null;
  heroImageUrl: string | null;
  category: string;
  tags: unknown;
  author: string;
  publishedAt: string | null;
  published: boolean;
  spotlightProviderSlug: string | null;
}

function mapRow(row: BlogRow): IBlogPost {
  return {
    _id: row.id,
    title: row.title,
    slug: { current: row.slug },
    content: (row.content as unknown[]) ?? [],
    metaDescription: row.metaDescription ?? "",
    heroImage: row.heroImageUrl
      ? { asset: { _ref: row.heroImageUrl, url: row.heroImageUrl } }
      : null,
    category: row.category as BlogCategory,
    tags: (row.tags as string[]) ?? [],
    author: row.author,
    publishedAt: row.publishedAt ?? "",
    spotlightProviderSlug: row.spotlightProviderSlug ?? undefined,
  };
}

async function isDbAvailable(): Promise<boolean> {
  try {
    await db.select({ id: blogPosts.id }).from(blogPosts).limit(1);
    return true;
  } catch {
    return false;
  }
}

async function sanityPosts(category?: BlogCategory | "all"): Promise<IBlogPost[]> {
  try {
    const { getAllPosts } = await import("@/lib/sanity");
    return await getAllPosts(category);
  } catch {
    return [];
  }
}

async function sanityPostBySlug(slug: string): Promise<IBlogPost | null> {
  try {
    const { getPostBySlug } = await import("@/lib/sanity");
    return await getPostBySlug(slug);
  } catch {
    return null;
  }
}

async function sanityRelated(category: string, slug: string, limit: number): Promise<IBlogPost[]> {
  try {
    const { getRelatedPosts } = await import("@/lib/sanity");
    return await getRelatedPosts(category, slug, limit);
  } catch {
    return [];
  }
}

/** Dedupe by slug, DB/admin posts win over Sanity and fallback posts. */
function mergeUnique(...groups: IBlogPost[][]): IBlogPost[] {
  const seen = new Set<string>();
  const out: IBlogPost[] = [];
  for (const group of groups) {
    for (const post of group) {
      if (!post?.slug?.current) continue;
      if (seen.has(post.slug.current)) continue;
      seen.add(post.slug.current);
      out.push(post);
    }
  }
  return out;
}

/**
 * Admin-managed blog posts backed by the `blog_posts` table, merged with Sanity
 * posts (when configured) and the seeded fallback posts (mock mode) so the blog
 * always renders. Admin posts take precedence; only published posts surface.
 */
export class BlogPostService {
  static async list(category?: BlogCategory | "all"): Promise<IBlogPost[]> {
    const [dbAvailable, sanity] = await Promise.all([
      isDbAvailable(),
      sanityPosts(category),
    ]);

    const dbPosts = dbAvailable
      ? category && category !== "all"
        ? await db
            .select()
            .from(blogPosts)
            .where(and(eq(blogPosts.published, true), eq(blogPosts.category, category)))
            .orderBy(desc(blogPosts.publishedAt))
        : await db.select().from(blogPosts).where(eq(blogPosts.published, true)).orderBy(desc(blogPosts.publishedAt))
      : [];

    const filteredFallback =
      category && category !== "all"
        ? getFallbackPosts().filter((p) => p.category === category)
        : getFallbackPosts();

    return mergeUnique(
      dbPosts.map(mapRow),
      sanity,
      filteredFallback,
    );
  }

  static async getBySlug(slug: string): Promise<IBlogPost | null> {
    const dbAvailable = await isDbAvailable();
    const [dbRows, sanity] = await Promise.all([
      dbAvailable
        ? db
            .select()
            .from(blogPosts)
            .where(and(eq(blogPosts.slug, slug), eq(blogPosts.published, true)))
            .limit(1)
        : Promise.resolve([]),
      sanityPostBySlug(slug),
    ]);
    return mergeUnique(dbRows.map(mapRow), sanity ? [sanity] : [], getFallbackPostBySlug(slug) ? [getFallbackPostBySlug(slug)!] : [])[0] ?? null;
  }

  static async getRelated(category: string, currentSlug: string, limit = 3): Promise<IBlogPost[]> {
    const dbAvailable = await isDbAvailable();
    const [dbRows, sanity] = await Promise.all([
      dbAvailable
        ? db
            .select()
            .from(blogPosts)
            .where(and(eq(blogPosts.category, category), eq(blogPosts.published, true), ne(blogPosts.slug, currentSlug)))
            .orderBy(desc(blogPosts.publishedAt))
            .limit(limit)
        : Promise.resolve([]),
      sanityRelated(category, currentSlug, limit),
    ]);
    return mergeUnique(
      dbRows.map(mapRow),
      sanity,
      getFallbackRelatedPosts(category, currentSlug, limit),
    ).slice(0, limit);
  }

  static async getAllSlugs(): Promise<{ slug: string }[]> {
    const dbAvailable = await isDbAvailable();
    const dbRows = dbAvailable
      ? await db.select({ slug: blogPosts.slug }).from(blogPosts).where(eq(blogPosts.published, true))
      : [];
    let sanitySlugs: { slug: string }[] = [];
    try {
      const { getAllPostSlugs } = await import("@/lib/sanity");
      sanitySlugs = await getAllPostSlugs();
    } catch {}
    const slugs = new Set<string>();
    const out: { slug: string }[] = [];
    for (const s of [...dbRows, ...sanitySlugs, ...getFallbackPostSlugs()]) {
      if (slugs.has(s.slug)) continue;
      slugs.add(s.slug);
      out.push(s);
    }
    return out;
  }

  /** Admin — all posts including drafts, newest first. */
  static async adminList(): Promise<IBlogPost[]> {
    if (!(await isDbAvailable())) return getFallbackPosts();
    const rows = await db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
    return rows.map(mapRow);
  }

  static async getById(id: string): Promise<IBlogPost | null> {
    if (!(await isDbAvailable())) return null;
    const rows = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1);
    return rows[0] ? mapRow(rows[0]) : null;
  }

  static async create(input: BlogPostInput): Promise<IBlogPost> {
    const id = uuid();
    const slug = input.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const row: BlogRow = {
      id,
      title: input.title,
      slug,
      content: input.content ?? [],
      metaDescription: input.metaDescription ?? null,
      heroImageUrl: input.heroImageUrl ?? null,
      category: input.category,
      tags: input.tags ?? [],
      author: input.author,
      publishedAt: input.published ? new Date().toISOString() : null,
      published: input.published,
      spotlightProviderSlug: input.spotlightProviderSlug ?? null,
    };
    await db.insert(blogPosts).values(row);
    return mapRow(row);
  }

  static async update(id: string, input: Partial<BlogPostInput>): Promise<IBlogPost | null> {
    if (!(await isDbAvailable())) return null;
    const existing = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1);
    if (!existing[0]) return null;

    const slug = input.slug
      ? input.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
      : existing[0].slug;

    const published = input.published ?? existing[0].published;
    const row: BlogRow = {
      id: existing[0].id,
      title: input.title ?? existing[0].title,
      slug,
      content: input.content ?? existing[0].content,
      metaDescription:
        input.metaDescription !== undefined
          ? (input.metaDescription ?? null)
          : existing[0].metaDescription,
      heroImageUrl:
        input.heroImageUrl !== undefined
          ? (input.heroImageUrl ?? null)
          : existing[0].heroImageUrl,
      category: input.category ?? existing[0].category,
      tags: input.tags ?? existing[0].tags,
      author: input.author ?? existing[0].author,
      published,
      publishedAt: published
        ? existing[0].publishedAt || new Date().toISOString()
        : null,
      spotlightProviderSlug:
        input.spotlightProviderSlug !== undefined
          ? (input.spotlightProviderSlug ?? null)
          : existing[0].spotlightProviderSlug,
    };
    await db.update(blogPosts).set(row).where(eq(blogPosts.id, id));
    return mapRow(row);
  }

  static async remove(id: string): Promise<boolean> {
    if (!(await isDbAvailable())) return false;
    await db.delete(blogPosts).where(eq(blogPosts.id, id));
    return true;
  }
}
