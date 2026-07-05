"use client";

import { useCallback, useState, useMemo, useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ExploreFilterBar } from "@/components/explore/ExploreFilterBar";
import { ExploreGrid } from "@/components/explore/ExploreGrid";
import type {
  IExploreFilters,
  PaginatedResponse,
  IExploreCard,
  ICategoryConfig,
} from "@/types";

interface CategoryClientPageProps {
  category: ICategoryConfig;
  stats: {
    activeCount: number;
    avgRating: number;
    minPrice: number;
  };
  categories: ICategoryConfig[];
}

export function CategoryClientPage({
  category,
  stats,
  categories,
}: CategoryClientPageProps) {
  const initialFilters: IExploreFilters = { category: category.slug };
  const [filters, setFilters] = useState<IExploreFilters>(initialFilters);

  const fetchProviders = useCallback(
    async ({ pageParam }: { pageParam: string | undefined }) => {
      const params = new URLSearchParams();
      if (filters.category) params.set("category", filters.category);
      if (filters.location) params.set("location", filters.location);
      if (filters.budgetMin !== undefined) params.set("budgetMin", String(filters.budgetMin));
      if (filters.budgetMax !== undefined) params.set("budgetMax", String(filters.budgetMax));
      if (filters.q) params.set("q", filters.q);
      if (filters.sort) params.set("sort", filters.sort);
      if (pageParam) params.set("cursor", pageParam);

      const res = await fetch(`/api/explore?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json: PaginatedResponse<IExploreCard> = await res.json();
      return json;
    },
    [filters],
  );

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isError,
  } = useInfiniteQuery({
    queryKey: ["explore", filters],
    queryFn: fetchProviders,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.cursor : undefined),
  });

  const providers = useMemo(
    () => data?.pages.flatMap((p) => p.data) ?? [],
    [data],
  );

  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handler = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const handleScrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <section className="max-w-[1200px] mx-auto px-6 py-12 pb-10">
        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[var(--color-accent-muted)] border border-[var(--color-accent)] text-[var(--color-accent)] font-[family-name:var(--font-body)] font-semibold text-[12px] mb-3">
          {category.label}
        </span>
        <h1 className="font-[family-name:var(--font-display)] font-extrabold text-[3rem] max-[640px]:text-[1.875rem] text-[var(--color-text-primary)] leading-[1.15] max-w-[640px] tracking-[-0.02em]">
          Hire {category.label}s in Nigeria
        </h1>
        <p className="font-[family-name:var(--font-body)] text-[16px] text-[var(--color-text-secondary)] max-w-[560px] leading-[1.6] mt-3">
          {category.description}
        </p>
        <div className="flex gap-8 flex-wrap mt-6">
          <div>
            <div className="font-[family-name:var(--font-mono)] text-[2.25rem] font-bold leading-[1] tabular-nums text-[var(--color-accent)]">
              {stats.activeCount}
            </div>
            <div className="font-[family-name:var(--font-body)] text-[13px] text-[var(--color-text-secondary)] mt-0.5">
              Active creators
            </div>
          </div>
          <div>
            <div className="font-[family-name:var(--font-mono)] text-[2.25rem] font-bold leading-[1] tabular-nums text-[var(--color-accent)]">
              ₦{(stats.minPrice / 100).toLocaleString("en-NG")}
            </div>
            <div className="font-[family-name:var(--font-body)] text-[13px] text-[var(--color-text-secondary)] mt-0.5">
              Starting price
            </div>
          </div>
          <div>
            <div className="font-[family-name:var(--font-mono)] text-[2.25rem] font-bold leading-[1] tabular-nums text-[var(--color-warning)]">
              {stats.avgRating.toFixed(1)}★
            </div>
            <div className="font-[family-name:var(--font-body)] text-[13px] text-[var(--color-text-secondary)] mt-0.5">
              Average rating
            </div>
          </div>
        </div>
      </section>

      <ExploreFilterBar
        categories={categories}
        filters={filters}
        onFiltersChange={setFilters}
        categoryDisabled
      />

      <ExploreGrid
        providers={providers}
        isLoading={isLoading}
        hasMore={!!hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
        isError={isError}
      />

      <button
        onClick={handleScrollToTop}
        aria-label="Scroll to top"
        className={`fixed bottom-8 right-8 max-[640px]:bottom-4 max-[640px]:right-4 w-11 h-11 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] cursor-pointer flex items-center justify-center transition-[opacity,background] duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text-primary)] z-30 ${
          scrollY > 300 ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <svg
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          viewBox="0 0 24 24"
          width="20"
          height="20"
        >
          <path d="M18 15l-6-6-6 6" />
        </svg>
      </button>
    </div>
  );
}
