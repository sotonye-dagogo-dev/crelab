"use client";

import { useCallback } from "react";
import { Search } from "lucide-react";
import type { IExploreFilters, ICategoryConfig } from "@/types";
import { ExploreSort } from "@/types";

interface ExploreFilterBarProps {
  categories: ICategoryConfig[];
  filters: IExploreFilters;
  onFiltersChange: (filters: IExploreFilters) => void;
  showSearch?: boolean;
  categoryDisabled?: boolean;
  sticky?: boolean;
}

export function ExploreFilterBar({
  categories,
  filters,
  onFiltersChange,
  showSearch = true,
  categoryDisabled = false,
  sticky = true,
}: ExploreFilterBarProps) {
  const updateFilter = useCallback(
    (key: keyof IExploreFilters, value: string | undefined) => {
      onFiltersChange({ ...filters, [key]: value || undefined, cursor: undefined });
    },
    [filters, onFiltersChange],
  );

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateFilter("q", e.target.value);
    },
    [updateFilter],
  );

  const handleCategory = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateFilter("category", e.target.value);
    },
    [updateFilter],
  );

  const handleLocation = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateFilter("location", e.target.value);
    },
    [updateFilter],
  );

  const handleBudget = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      if (!val) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { budgetMin, budgetMax, ...rest } = filters;
        onFiltersChange({ ...rest, cursor: undefined });
        return;
      }
      const [min, max] = val.split("-").map((s) => (s ? parseInt(s) * 100 : undefined));
      onFiltersChange({ ...filters, budgetMin: min, budgetMax: max, cursor: undefined });
    },
    [filters, onFiltersChange],
  );

  const handleSort = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateFilter("sort", e.target.value || undefined);
    },
    [updateFilter],
  );

  const budgetOptions = [
    { value: "", label: "Budget" },
    { value: "0-50000", label: "Under ₦50k" },
    { value: "50000-100000", label: "₦50k–₦100k" },
    { value: "100000-", label: "₦100k+" },
  ];

  return (
    <div
      className={`w-full h-14 bg-[rgba(10,10,10,0.95)] backdrop-blur-[8px] border-b border-[var(--color-border)] z-40 flex items-center px-6 ${
        sticky ? "sticky top-[var(--nav-height,69px)]" : ""
      }`}
    >
      <div className="max-w-[1200px] w-full mx-auto flex flex-row gap-3 items-center h-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {showSearch && (
          <div className="relative flex-1 min-w-[120px]">
            <Search className="absolute left-[10px] top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)] pointer-events-none" />
            <input
              type="text"
              placeholder="Search creators..."
              value={filters.q ?? ""}
              onChange={handleSearch}
              className="w-full h-9 rounded-[8px] bg-[var(--color-surface)] border border-[var(--color-border)] pl-[34px] pr-3 text-[14px] text-[var(--color-text-primary)] outline-none transition-[border-color] duration-[150ms] ease-[cubic-bezier(0.16,1,0.3,1)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)]"
            />
          </div>
        )}

        <select
          value={filters.category ?? ""}
          onChange={handleCategory}
          disabled={categoryDisabled}
          className={`h-9 min-w-[120px] rounded-[8px] bg-[var(--color-surface)] border border-[var(--color-border)] px-3 pr-8 text-[14px] text-[var(--color-text-secondary)] cursor-pointer outline-none appearance-none transition-[border-color,color] duration-[150ms] ease-[cubic-bezier(0.16,1,0.3,1)] focus:border-[var(--color-accent)] disabled:opacity-70 disabled:cursor-not-allowed disabled:bg-[var(--color-surface-raised)] disabled:text-[var(--color-text-tertiary)]
            ${filters.category ? "border-[var(--color-accent)] text-[var(--color-text-primary)]" : ""}
            bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%239A9A9A' viewBox='0 0 16 16'%3E%3Cpath d='M4.646 5.646a.5.5 0 0 1 .708 0L8 8.293l2.646-2.647a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 0 1 0-.708z'/%3E%3C/svg%3E")] [background-repeat:no-repeat] bg-[right_10px_center]`}
        >
          <option value="">All Categories</option>
          {categories
            .filter((c) => c.active)
            .map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
        </select>

        <select
          value={filters.location ?? ""}
          onChange={handleLocation}
          className={`h-9 min-w-[120px] rounded-[8px] bg-[var(--color-surface)] border border-[var(--color-border)] px-3 pr-8 text-[14px] text-[var(--color-text-secondary)] cursor-pointer outline-none appearance-none transition-[border-color,color] duration-[150ms] ease-[cubic-bezier(0.16,1,0.3,1)] focus:border-[var(--color-accent)]
            ${filters.location ? "border-[var(--color-accent)] text-[var(--color-text-primary)]" : ""}
            bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%239A9A9A' viewBox='0 0 16 16'%3E%3Cpath d='M4.646 5.646a.5.5 0 0 1 .708 0L8 8.293l2.646-2.647a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 0 1 0-.708z'/%3E%3C/svg%3E")] [background-repeat:no-repeat] bg-[right_10px_center]`}
        >
          <option value="">Location</option>
          <option value="Lagos">Lagos</option>
          <option value="Abuja">Abuja</option>
          <option value="Port Harcourt">Port Harcourt</option>
        </select>

        <select
          value={
            filters.budgetMin !== undefined && filters.budgetMax !== undefined
              ? `${filters.budgetMin / 100}-${filters.budgetMax ? filters.budgetMax / 100 : ""}`
              : filters.budgetMin !== undefined
                ? `${filters.budgetMin / 100}-`
                : ""
          }
          onChange={handleBudget}
          className={`h-9 min-w-[120px] rounded-[8px] bg-[var(--color-surface)] border border-[var(--color-border)] px-3 pr-8 text-[14px] text-[var(--color-text-secondary)] cursor-pointer outline-none appearance-none transition-[border-color,color] duration-[150ms] ease-[cubic-bezier(0.16,1,0.3,1)] focus:border-[var(--color-accent)]
            ${filters.budgetMin !== undefined ? "border-[var(--color-accent)] text-[var(--color-text-primary)]" : ""}
            bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%239A9A9A' viewBox='0 0 16 16'%3E%3Cpath d='M4.646 5.646a.5.5 0 0 1 .708 0L8 8.293l2.646-2.647a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 0 1 0-.708z'/%3E%3C/svg%3E")] [background-repeat:no-repeat] bg-[right_10px_center]`}
        >
          {budgetOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={filters.sort ?? ""}
          onChange={handleSort}
          className={`h-9 min-w-[120px] rounded-[8px] bg-[var(--color-surface)] border border-[var(--color-border)] px-3 pr-8 text-[14px] text-[var(--color-text-secondary)] cursor-pointer outline-none appearance-none transition-[border-color,color] duration-[150ms] ease-[cubic-bezier(0.16,1,0.3,1)] focus:border-[var(--color-accent)]
            ${filters.sort ? "border-[var(--color-accent)] text-[var(--color-text-primary)]" : ""}
            bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%239A9A9A' viewBox='0 0 16 16'%3E%3Cpath d='M4.646 5.646a.5.5 0 0 1 .708 0L8 8.293l2.646-2.647a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 0 1 0-.708z'/%3E%3C/svg%3E")] [background-repeat:no-repeat] bg-[right_10px_center]`}
        >
          <option value="">Sort: Newest</option>
          <option value={ExploreSort.TOP_RATED}>Sort: Top Rated</option>
          <option value={ExploreSort.MOST_BOOKED}>Sort: Most Booked</option>
          <option value={ExploreSort.FEATURED}>Sort: Featured</option>
        </select>
      </div>
    </div>
  );
}
