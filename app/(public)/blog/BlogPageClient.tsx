"use client";

import { useState } from "react";
import type { IBlogPost, BlogCategory } from "@/types/blog";
import type { IBlogConfig } from "@/types";
import { BlogCard } from "@/components/blog/BlogCard";
import { ContentBlocks } from "@/components/blog/ContentBlocks";
import { ClEmptyState, ClButton, ClInput } from "@/components/ui";
import { useToast } from "@/lib/toast";

interface BlogPageClientProps {
  posts: IBlogPost[];
  blogConfig?: IBlogConfig;
}

const categories: { value: BlogCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "content-creation", label: "Content Creation" },
  { value: "hiring-guides", label: "Hiring Guides" },
  { value: "creator-spotlights", label: "Creator Spotlights" },
  { value: "pricing", label: "Pricing" },
  { value: "industry-news", label: "Industry News" },
];

const FALLBACK_BLOG_CONFIG: IBlogConfig = {
  heroTitle: "Insights for Nigerian Creators & Brands",
  heroSubtitle:
    "Hiring guides, pricing tips, and spotlights on the creators making Nigeria's best content.",
  newsletter: {
    enabled: true,
    title: "The Creator's Brief",
    subtitle:
      "One email a month with hiring trends, pricing benchmarks, and the creators moving the industry forward.",
    buttonLabel: "Subscribe",
    successMessage: "You're on the list — check your inbox for the first issue.",
  },
  footerTagline: "Get hired for your creativity, not your follower count.",
};

export function BlogPageClient({ posts, blogConfig }: BlogPageClientProps) {
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState<BlogCategory | "all">("all");
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const cfg = blogConfig ?? FALLBACK_BLOG_CONFIG;

  const filteredPosts =
    activeCategory === "all"
      ? posts
      : posts.filter((post) => post.category === activeCategory);

  const handleSubscribe = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Subscription failed");
      setSubscribed(true);
      toast(cfg.newsletter.successMessage, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Subscription failed", "error");
    }
  };

  return (
    <div className="blog-index pt-14 max-sm:pt-12">
      <div className="max-w-[1200px] mx-auto px-6 max-sm:px-4">
        <div className="pt-20 pb-12 max-sm:pt-[60px] max-sm:pb-8">
          <h1 className="font-[family-name:var(--font-display)] font-extrabold text-[40px] text-[var(--color-text-primary)] max-w-[520px] leading-tight tracking-[-0.02em] max-sm:text-[28px] max-sm:max-w-full">
            {cfg.heroTitle}
          </h1>
          <p className="font-[family-name:var(--font-body)] text-[16px] text-[var(--color-text-secondary)] mt-3 max-w-[440px] leading-normal max-sm:text-[15px] max-sm:max-w-full">
            {cfg.heroSubtitle}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mt-8 max-sm:mt-6">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`font-[family-name:var(--font-body)] font-semibold text-[13px] px-4 py-[7px] rounded-full cursor-pointer border border-transparent transition-[background,color,border-color] duration-[150ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                activeCategory === cat.value
                  ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)]"
                  : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-mid)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6 mt-8 pb-16 max-lg:grid-cols-2 max-sm:grid-cols-1 max-sm:gap-4 max-sm:px-0 max-sm:mt-6 max-sm:pb-12">
          {filteredPosts.map((post) => (
            <BlogCard
              key={post._id}
              post={post}
              isSpotlight={post.category === "creator-spotlights"}
              spotlightAvatar={
                post.author
                  ? post.author
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)
                  : undefined
              }
            />
          ))}
        </div>

        {filteredPosts.length === 0 && (
          <ClEmptyState
            title="No posts in this category yet"
            message="Check back later for new content."
          />
        )}

        {cfg.sections && cfg.sections.length > 0 && (
          <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] px-8 py-8 mb-16 max-sm:px-5 max-sm:py-6">
            <ContentBlocks blocks={cfg.sections} />
          </div>
        )}

        {cfg.newsletter.enabled && (
          <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] px-8 py-10 mb-16 max-sm:px-6 max-sm:py-8">
            <div className="flex flex-col items-center text-center gap-2">
              <h2 className="font-[family-name:var(--font-display)] font-bold text-[26px] text-[var(--color-text-primary)] tracking-[-0.01em] max-sm:text-[22px]">
                {cfg.newsletter.title}
              </h2>
              <p className="font-[family-name:var(--font-body)] text-[15px] text-[var(--color-text-secondary)] max-w-[460px] leading-normal">
                {cfg.newsletter.subtitle}
              </p>
            </div>
            {subscribed ? (
              <p className="text-center text-[14px] text-[var(--color-accent)] mt-6 font-semibold">
                {cfg.newsletter.successMessage}
              </p>
            ) : (
              <form onSubmit={handleSubscribe} className="flex items-center gap-3 mt-6 justify-center max-sm:flex-col">
                <ClInput
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="max-w-[360px]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <ClButton type="submit" variant="primary" size="default">
                  {cfg.newsletter.buttonLabel}
                </ClButton>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
