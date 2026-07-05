"use client";

import { useState } from "react";
import type { IBlogPost, BlogCategory } from "@/types/blog";
import { BlogCard } from "@/components/blog/BlogCard";

interface BlogPageClientProps {
  posts: IBlogPost[];
}

const categories: { value: BlogCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "content-creation", label: "Content Creation" },
  { value: "hiring-guides", label: "Hiring Guides" },
  { value: "creator-spotlights", label: "Creator Spotlights" },
  { value: "pricing", label: "Pricing" },
  { value: "industry-news", label: "Industry News" },
];

export function BlogPageClient({ posts }: BlogPageClientProps) {
  const [activeCategory, setActiveCategory] = useState<BlogCategory | "all">("all");

  const filteredPosts =
    activeCategory === "all"
      ? posts
      : posts.filter((post) => post.category === activeCategory);

  return (
    <div className="blog-index pt-14 max-sm:pt-12">
      <div className="max-w-[1200px] mx-auto px-6 max-sm:px-4">
        <div className="pt-20 pb-12 max-sm:pt-[60px] max-sm:pb-8">
          <h1 className="font-[family-name:var(--font-display)] font-extrabold text-[40px] text-[var(--color-text-primary)] max-w-[520px] leading-tight tracking-[-0.02em] max-sm:text-[28px] max-sm:max-w-full">
            Insights for Nigerian Creators &amp; Brands
          </h1>
          <p className="font-[family-name:var(--font-body)] text-[16px] text-[var(--color-text-secondary)] mt-3 max-w-[440px] leading-normal max-sm:text-[15px] max-sm:max-w-full">
            Hiring guides, pricing tips, and spotlights on the creators making
            Nigeria&apos;s best content.
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
          <div className="text-center py-16 text-[var(--color-text-tertiary)]">
            No posts in this category yet.
          </div>
        )}
      </div>
    </div>
  );
}
