import Link from "next/link";
import type { IBlogPost } from "@/types/blog";
import { urlFor } from "@/lib/sanity";

const categoryStyles: Record<string, string> = {
  "content-creation":
    "bg-[rgba(96,165,250,0.1)] border-[rgba(96,165,250,0.3)] text-[var(--color-info)]",
  "hiring-guides":
    "bg-[rgba(74,222,128,0.08)] border-[rgba(74,222,128,0.2)] text-[var(--color-success)]",
  "creator-spotlights":
    "bg-[var(--color-accent-muted)] border-[var(--color-accent)] text-[var(--color-accent)]",
  pricing:
    "bg-[rgba(250,204,21,0.08)] border-[rgba(250,204,21,0.2)] text-[var(--color-warning)]",
  "industry-news":
    "bg-[rgba(167,139,250,0.08)] border-[rgba(167,139,250,0.2)] text-[var(--color-escrow-progress)]",
};

const categoryLabels: Record<string, string> = {
  "content-creation": "Content Creation",
  "hiring-guides": "Hiring Guides",
  "creator-spotlights": "Creator Spotlights",
  pricing: "Pricing",
  "industry-news": "Industry News",
};

interface BlogCardProps {
  post: IBlogPost;
  isSpotlight?: boolean;
  spotlightAvatar?: string;
}

export function BlogCard({ post, isSpotlight, spotlightAvatar }: BlogCardProps) {
  const heroGradient = post.heroImage
    ? undefined
    : categoryStyles[post.category]?.includes("info")
      ? "linear-gradient(135deg,#0D1A1A,#0A1A10)"
      : categoryStyles[post.category]?.includes("success")
        ? "linear-gradient(135deg,#1A0D1A,#100A1A)"
        : categoryStyles[post.category]?.includes("warning")
          ? "linear-gradient(135deg,#1A1A0D,#0A0A00)"
          : "linear-gradient(135deg,#0D1A1A,#0A1A10)";

  return (
    <Link href={`/blog/${post.slug.current}`} className="block no-underline group">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[16px] overflow-hidden cursor-pointer transition-[border-color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col group-hover:border-[var(--color-border-mid)]">
        {post.heroImage ? (
          <div
            className="h-[200px] bg-cover bg-center"
            style={{
              backgroundImage: `url(${urlFor(post.heroImage).width(600).height(200).url()})`,
            }}
          />
        ) : (
          <div className="h-[200px]" style={{ background: heroGradient }} />
        )}
        <div className="p-5 flex flex-col flex-1">
          {isSpotlight && spotlightAvatar && (
            <div className="w-7 h-7 rounded-full bg-[var(--color-surface-raised)] flex items-center justify-center font-[family-name:var(--font-display)] text-[11px] font-bold text-[var(--color-text-primary)] mb-2">
              {spotlightAvatar}
            </div>
          )}
          <span
            className={`inline-flex self-start font-semibold text-[11px] px-2 py-[3px] rounded-full border border-transparent ${
              categoryStyles[post.category] ?? ""
            }`}
          >
            {categoryLabels[post.category] ?? post.category}
          </span>
          <h3 className="font-[family-name:var(--font-display)] font-bold text-[16px] text-[var(--color-text-primary)] leading-tight mt-2 line-clamp-2">
            {post.title}
          </h3>
          {post.metaDescription && (
            <p className="font-[family-name:var(--font-body)] text-[13px] text-[var(--color-text-secondary)] leading-normal mt-[6px] line-clamp-2 flex-1">
              {post.metaDescription}
            </p>
          )}
          <div className="flex justify-between items-center mt-3">
            {post.author && (
              <span className="font-[family-name:var(--font-body)] text-[12px] text-[var(--color-text-tertiary)]">
                By {post.author}
              </span>
            )}
          </div>
          {isSpotlight && (
            <span className="font-[family-name:var(--font-body)] text-[12px] font-semibold text-[var(--color-accent)] no-underline mt-2 inline-block hover:text-[var(--color-accent-dim)]">
              View Profile →
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
