"use client";

import { useCallback, useState, useMemo, useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ChevronUp, Grid, List } from "lucide-react";
import { usePlatformConfig } from "@/lib/config-context";
import { ExploreFilterBar } from "@/components/explore/ExploreFilterBar";
import { ExploreGrid } from "@/components/explore/ExploreGrid";
import { PortfolioGallery } from "@/components/explore/PortfolioGallery";
import type { IExploreFilters, PaginatedResponse, IExploreCard, IPortfolioItem } from "@/types";

type PortfolioGalleryResponse = PaginatedResponse<IPortfolioItem>;

export default function ExplorePage() {
  const platformConfig = usePlatformConfig();
  const [filters, setFilters] = useState<IExploreFilters>({});
  const [scrollY, setScrollY] = useState(0);
  const [viewMode, setViewMode] = useState<"creators" | "gallery">("creators");

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

  const fetchPortfolioItems = useCallback(
    async ({ pageParam }: { pageParam: string | undefined }) => {
      const params = new URLSearchParams();
      if (filters.category) params.set("category", filters.category);
      if (filters.location) params.set("location", filters.location);
      if (filters.budgetMin !== undefined) params.set("budgetMin", String(filters.budgetMin));
      if (filters.budgetMax !== undefined) params.set("budgetMax", String(filters.budgetMax));
      if (filters.q) params.set("q", filters.q);
      if (filters.sort) params.set("sort", filters.sort);
      if (pageParam) params.set("cursor", pageParam);

      const res = await fetch(`/api/explore/portfolio?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json: PortfolioGalleryResponse = await res.json();
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
    enabled: viewMode === "creators",
  });

  const {
    data: galleryData,
    isLoading: galleryLoading,
    fetchNextPage: fetchGalleryNextPage,
    hasNextPage: galleryHasNextPage,
    isFetchingNextPage: galleryFetching,
    isError: galleryError,
  } = useInfiniteQuery({
    queryKey: ["explore-portfolio", filters],
    queryFn: fetchPortfolioItems,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.cursor : undefined),
    enabled: viewMode === "gallery",
  });

  const providers = useMemo(
    () => data?.pages.flatMap((p) => p.data) ?? [],
    [data],
  );

  const portfolioItems = useMemo(
    () => galleryData?.pages.flatMap((p) => p.data) ?? [],
    [galleryData],
  );

  const handleScrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <ExploreFilterBar
        categories={platformConfig.categories}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* View Mode Toggle — gallery + creators, restored and prominent */}
      <div className="max-w-[1200px] mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex rounded-[10px] border border-[var(--color-border)] p-1 bg-[var(--color-surface)] w-fit">
          <button
            onClick={() => setViewMode("creators")}
            className={`px-4 py-1.5 text-[13px] font-semibold rounded-[6px] transition-colors inline-flex items-center gap-1.5 cursor-pointer border-none ${
              viewMode === "creators"
                ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)] shadow-sm"
                : "bg-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <List size={14} strokeWidth={2} />
            Creators
          </button>
          <button
            onClick={() => setViewMode("gallery")}
            className={`px-4 py-1.5 text-[13px] font-semibold rounded-[6px] transition-colors inline-flex items-center gap-1.5 cursor-pointer border-none ${
              viewMode === "gallery"
                ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)] shadow-sm"
                : "bg-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <Grid size={14} strokeWidth={2} />
            Portfolio Gallery
          </button>
        </div>
        <div className="text-[12px] text-[var(--color-text-tertiary)]">
          {viewMode === "creators" ? "Browse creators — tiles cycle through avatar & portfolio shots so nothing stays blank" : "Browse individual portfolio pieces from all creators"}
        </div>
      </div>

      {viewMode === "creators" ? (
        <ExploreGrid
          providers={providers}
          isLoading={isLoading}
          hasMore={!!hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
          isError={isError}
        />
      ) : (
        <PortfolioGallery
          items={portfolioItems}
          isLoading={galleryLoading}
          hasMore={!!galleryHasNextPage}
          isFetchingNextPage={galleryFetching}
          fetchNextPage={fetchGalleryNextPage}
          isError={galleryError}
        />
      )}

      <button
        onClick={handleScrollToTop}
        aria-label="Scroll to top"
        className={`fixed bottom-8 right-8 max-[640px]:bottom-4 max-[640px]:right-4 w-11 h-11 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] cursor-pointer flex items-center justify-center z-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] ${
          scrollY > 300 ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <ChevronUp size={20} strokeWidth={2.5} />
      </button>
    </div>
  );
}
