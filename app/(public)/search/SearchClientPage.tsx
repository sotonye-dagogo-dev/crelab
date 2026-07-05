"use client";

import { useCallback, useState, useMemo, useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { usePlatformConfig } from "@/lib/config-context";
import { ExploreFilterBar } from "@/components/explore/ExploreFilterBar";
import { ExploreGrid } from "@/components/explore/ExploreGrid";
import type { IExploreFilters, PaginatedResponse, IExploreCard } from "@/types";

interface SearchClientPageProps {
  query: string;
}

export function SearchClientPage({ query }: SearchClientPageProps) {
  const platformConfig = usePlatformConfig();

  const initialFilters: IExploreFilters = { q: query || undefined };
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

  const totalCount = useMemo(
    () => data?.pages[0]?.data.length ?? 0,
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
      <div className="max-w-[1200px] mx-auto px-6 py-8 pb-6 flex justify-between items-center gap-4 flex-wrap">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-[family-name:var(--font-body)] text-[14px] text-[var(--color-text-secondary)]">
            Search results for
          </span>
          <span className="font-[family-name:var(--font-display)] font-bold text-[28px] max-[640px]:text-[22px] text-[var(--color-text-primary)]">
            {query ? (
              <>
                &ldquo;<span className="text-[var(--color-accent)]">{query}</span>&rdquo;
              </>
            ) : (
              "All creators"
            )}
          </span>
        </div>
        <span className="font-[family-name:var(--font-mono)] text-[14px] text-[var(--color-text-tertiary)]">
          {totalCount} result{totalCount !== 1 ? "s" : ""}
        </span>
      </div>

      <ExploreFilterBar
        categories={platformConfig.categories}
        filters={filters}
        onFiltersChange={setFilters}
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
