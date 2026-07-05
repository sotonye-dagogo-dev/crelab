import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getPostBySlug, getRelatedPosts, urlFor } from "@/lib/sanity";
import { ArticleBody } from "@/components/blog/ArticleBody";
import { ToCSidebar } from "@/components/blog/ToCSidebar";
import { CreatorSpotlightEmbed } from "@/components/blog/CreatorSpotlightEmbed";
import { DEFAULT_CONFIG } from "@/config/platform.config";

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { DEFAULT_CONFIG } = await import("@/config/platform.config");
  try {
    const post = await getPostBySlug(slug);
    if (!post) return { title: "Post Not Found" };

    return {
      title: `${post.title} | ${DEFAULT_CONFIG.name}`,
      description: post.metaDescription,
      openGraph: post.heroImage
        ? {
            images: [{ url: urlFor(post.heroImage).width(1200).height(630).url() }],
          }
        : undefined,
    };
  } catch {
    return { title: "Post Not Found" };
  }
}

function extractToC(content: unknown[]): { id: string; text: string; level: number }[] {
  const items: { id: string; text: string; level: number }[] = [];
  if (!Array.isArray(content)) return items;

  for (const block of content) {
    if (
      block &&
      typeof block === "object" &&
      "_type" in block &&
      (block as Record<string, unknown>)._type === "block" &&
      "style" in block &&
      "children" in block &&
      Array.isArray((block as Record<string, unknown>).children)
    ) {
      const style = (block as Record<string, unknown>).style as string;
      if (style === "h2" || style === "h3") {
        const children = (block as Record<string, unknown>).children as {
          text?: string;
          _key?: string;
        }[];
        const text = children.map((c) => c.text ?? "").join("");
        const key = (block as Record<string, unknown>)._key as string;
        const id = key ? `sec-${key}` : text.toLowerCase().replace(/\s+/g, "-");
        items.push({ id, text, level: style === "h2" ? 2 : 3 });
      }
    }
  }
  return items;
}

function getReadTime(content: unknown[]): string {
  if (!Array.isArray(content)) return "1 min read";
  const text = content
    .filter(
      (b): b is Record<string, unknown> =>
        typeof b === "object" && b !== null && (b as Record<string, unknown>)._type === "block",
    )
    .map((b) => {
      const children = (b as Record<string, unknown>).children;
      if (Array.isArray(children)) {
        return children.map((c: Record<string, unknown>) => c.text ?? "").join("");
      }
      return "";
    })
    .join(" ");
  const words = text.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min read`;
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) notFound();

  const tocItems = extractToC(post.content as unknown[]);
  const readTime = getReadTime(post.content as unknown[]);
  const relatedPosts = await getRelatedPosts(post.category, slug);

  return (
    <div className="article-page pt-14 max-sm:pt-12">
      <div
        className="w-full h-[380px] flex items-center justify-center relative max-sm:h-[260px]"
        style={{
          background: post.heroImage
            ? `url(${urlFor(post.heroImage).width(1200).height(380).url()}) center/cover`
            : "linear-gradient(135deg, #0A0A0A, #1E2200)",
        }}
      >
        <div className="max-w-[720px] w-full px-6 text-center">
          <span
            className="inline-flex self-start font-semibold text-[11px] px-2 py-[3px] rounded-full border border-transparent"
            style={{
              background: "rgba(167,139,250,0.08)",
              borderColor: "rgba(167,139,250,0.2)",
              color: "var(--color-escrow-progress)",
            }}
          >
            {post.category.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
          </span>
          <h1 className="font-[family-name:var(--font-display)] font-extrabold text-[36px] text-[var(--color-text-primary)] max-w-[640px] mx-auto mt-3 leading-tight tracking-[-0.02em] max-sm:text-[24px]">
            {post.title}
          </h1>
        </div>
      </div>

      <div className="max-w-[720px] mx-auto px-6 mt-8 relative max-sm:mt-6">
        <ToCSidebar items={tocItems} />

        <div className="flex flex-wrap gap-4 items-center">
          {post.author && (
            <span className="text-[13px] text-[var(--color-text-secondary)]">
              {post.author}
            </span>
          )}
          {post.author && <span className="text-[13px] text-[var(--color-text-tertiary)]">·</span>}
          <span className="text-[13px] text-[var(--color-text-tertiary)]">
            {formatDate(post.publishedAt)}
          </span>
          <span className="text-[13px] text-[var(--color-text-tertiary)]">·</span>
          <span className="text-[13px] text-[var(--color-text-tertiary)]">{readTime}</span>
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 ml-auto">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-full px-2 py-[3px] text-[11px] text-[var(--color-text-secondary)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <hr className="border-t border-[var(--color-border)] mt-5 mb-0" />

        <div className="mt-6">
          <ArticleBody content={post.content as unknown[]} />
        </div>

        {post.spotlightProviderSlug && (
          <CreatorSpotlightEmbed providerSlug={post.spotlightProviderSlug} />
        )}

        {relatedPosts.length > 0 && (
          <div className="mt-12">
            <h2 className="font-[family-name:var(--font-display)] font-bold text-[18px] text-[var(--color-text-primary)] mb-4">
              More Articles
            </h2>
            <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
              {relatedPosts.map((related) => (
                <a
                  key={related._id}
                  href={`/blog/${related.slug.current}`}
                  className="block no-underline group"
                >
                  <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[12px] overflow-hidden cursor-pointer transition-[border-color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:border-[var(--color-border-mid)]">
                    {related.heroImage ? (
                      <div
                        className="h-[120px] bg-cover bg-center"
                        style={{
                          backgroundImage: `url(${urlFor(related.heroImage).width(400).height(120).url()})`,
                        }}
                      />
                    ) : (
                      <div
                        className="h-[120px]"
                        style={{
                          background:
                            "linear-gradient(135deg,#1A0D1A,#100A1A)",
                        }}
                      />
                    )}
                    <div className="p-3 font-[family-name:var(--font-display)] font-semibold text-[14px] text-[var(--color-text-primary)] leading-tight">
                      {related.title}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[16px] p-8 text-center mt-12 mb-20">
          <h3 className="font-[family-name:var(--font-display)] font-bold text-[22px] text-[var(--color-text-primary)]">
            Looking for a creator?
          </h3>
          <p className="font-[family-name:var(--font-body)] text-[14px] text-[var(--color-text-secondary)] mt-2">
            Browse Nigerian creative talent on {DEFAULT_CONFIG.name} →
          </p>
          <Link
            href="/explore"
            className="inline-flex items-center justify-center gap-2 h-12 px-6 text-[15px] font-semibold rounded-[8px] bg-[var(--color-accent)] text-[var(--color-text-inverse)] no-underline whitespace-nowrap mt-5 transition-[background] duration-[150ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[var(--color-accent-dim)]"
          >
            Browse Creators
          </Link>
        </div>
      </div>
    </div>
  );
}
