"use client";

import { useCallback, useState, useMemo, useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { usePlatformConfig } from "@/lib/config-context";
import Link from "next/link";
import { ExploreFilterBar } from "@/components/explore/ExploreFilterBar";
import { ExploreGrid } from "@/components/explore/ExploreGrid";
import type { IExploreFilters, PaginatedResponse, IExploreCard } from "@/types";

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const platformConfig = usePlatformConfig();
  const [filters, setFilters] = useState<IExploreFilters>({});
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handler = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

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

  const handleScrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {!isAuthenticated && (
        <section className="w-full min-h-[220px] bg-gradient-to-b from-[var(--color-surface)] to-[var(--color-bg)] flex items-center px-6 py-12">
          <div className="max-w-[1200px] w-full mx-auto flex flex-row justify-between items-center gap-8 max-[640px]:flex-col max-[640px]:text-center">
            <div className="flex-1 max-w-[560px]">
              <h1 className="font-[family-name:var(--font-display)] font-extrabold text-[3rem] max-[640px]:text-[1.875rem] text-[var(--color-text-primary)] leading-[1.15] tracking-[-0.02em] mb-6">
                {platformConfig.tagline}
              </h1>
              <div className="flex gap-3 flex-wrap max-[640px]:justify-center">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center h-11 px-6 rounded-[8px] bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-semibold text-[15px] no-underline gap-2"
                >
                  Browse Creators
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center h-11 px-6 rounded-[8px] bg-transparent text-[var(--color-text-primary)] border border-[var(--color-border-mid)] font-semibold text-[15px] no-underline gap-2"
                >
                  Join as Creator
                </Link>
              </div>
            </div>
            <div className="w-[360px] h-[200px] rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] flex items-center justify-center flex-shrink-0 max-[640px]:hidden">
              <svg className="w-9 h-9 text-[rgba(255,255,255,0.4)]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </section>
      )}

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
        className={`fixed bottom-8 right-8 max-[640px]:bottom-4 max-[640px]:right-4 w-11 h-11 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] cursor-pointer flex items-center justify-center z-30 ${
          scrollY > 300 ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="20" height="20">
          <path d="M18 15l-6-6-6 6" />
        </svg>
      </button>
    </div>
  );
}
