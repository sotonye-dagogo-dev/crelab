"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

/**
 * Reusable pagination controls used across every data view (admin tables,
 * dashboards, feeds). Pure presentational — the consumer owns the page state
 * via `page` / `onPageChange`. Renders first/prev, a bounded set of page
 * numbers (with an ellipsis when there are many), and next/last.
 */
export function ClPagination({
  page,
  totalPages,
  onPageChange,
  pageSize,
  totalItems,
  className = "",
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Current page size — only used for the "Showing x–y of z" summary */
  pageSize?: number;
  /** Total item count — only used for the summary line */
  totalItems?: number;
  className?: string;
}) {
  if (totalPages <= 1 && !totalItems) return null;

  const safePage = Math.min(Math.max(page, 1), Math.max(totalPages, 1));
  const from = totalItems ? (safePage - 1) * (pageSize ?? 1) + 1 : null;
  const to = totalItems ? Math.min(safePage * (pageSize ?? 1), totalItems) : null;

  const numbers = getPageNumbers(safePage, totalPages);

  const btn =
    "inline-flex items-center justify-center h-8 min-w-8 px-2 rounded-[8px] text-[12px] font-semibold cursor-pointer border border-transparent transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {from !== null && totalItems !== undefined && (
        <div className="text-[12px] text-[var(--color-text-tertiary)]">
          Showing <span className="text-[var(--color-text-primary)] font-semibold">{from}</span>–
          <span className="text-[var(--color-text-primary)] font-semibold">{to}</span> of{" "}
          <span className="text-[var(--color-text-primary)] font-semibold">{totalItems}</span>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => onPageChange(1)}
            disabled={safePage <= 1}
            className={btn}
            aria-label="First page"
          >
            <ChevronsLeft size={14} strokeWidth={2} />
          </button>
          <button
            onClick={() => onPageChange(safePage - 1)}
            disabled={safePage <= 1}
            className={btn}
            aria-label="Previous page"
          >
            <ChevronLeft size={14} strokeWidth={2} />
          </button>

          {numbers.map((n, i) =>
            n === "…" ? (
              <span key={`e-${i}`} className="h-8 inline-flex items-center px-1 text-[12px] text-[var(--color-text-tertiary)]">
                …
              </span>
            ) : (
              <button
                key={n}
                onClick={() => onPageChange(n)}
                aria-current={n === safePage ? "page" : undefined}
                className={`${btn} ${
                  n === safePage
                    ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)]"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {n}
              </button>
            ),
          )}

          <button
            onClick={() => onPageChange(safePage + 1)}
            disabled={safePage >= totalPages}
            className={btn}
            aria-label="Next page"
          >
            <ChevronRight size={14} strokeWidth={2} />
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={safePage >= totalPages}
            className={btn}
            aria-label="Last page"
          >
            <ChevronsRight size={14} strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  );
}

function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) pages.push("…");
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total - 1) pages.push("…");
  pages.push(total);

  return pages;
}
