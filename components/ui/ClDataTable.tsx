"use client";

import { useEffect, useMemo, useState } from "react";
import { ClPagination } from "./ClPagination";

export interface ClColumn<T> {
  /** Stable, unique key for the column */
  key: string;
  /** Header cell content (omit to render an empty header cell) */
  header?: React.ReactNode;
  /** Renders the cell content for a row */
  cell: (row: T) => React.ReactNode;
  /** Applied to the <th> element */
  headerClassName?: string;
  /** Applied to every <td> in this column */
  cellClassName?: string;
  /** Optional fixed width (e.g. "w-[40px]") */
  width?: string;
  /** Hide the column below the lg breakpoint */
  hideOnMobile?: boolean;
}

/**
 * Universal data-table wrapper: config-driven columns, horizontal scroll on
 * narrow screens, optional client-side pagination, and a consistent empty
 * state. Adopt everywhere tables appear so the project keeps one visual
 * language and one set of responsiveness rules.
 */
export function ClDataTable<T>({
  columns,
  rows,
  rowKey,
  pageSize,
  emptyState,
  className = "",
  headerRowClassName = "",
}: {
  columns: ClColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** When set, the table is paginated client-side with this page size */
  pageSize?: number;
  emptyState?: React.ReactNode;
  className?: string;
  headerRowClassName?: string;
}) {
  const [page, setPage] = useState(1);
  const totalPages = pageSize ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1;

  // Keep the page in range when the dataset shrinks (search filters, deletes…).
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedRows = useMemo(() => {
    if (!pageSize) return rows;
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  return (
    <div className={className}>
      <div className="rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[720px]">
            <thead>
              <tr className={`bg-[var(--color-surface-raised)] ${headerRowClassName}`}>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-[14px] py-[10px] text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)] whitespace-nowrap ${
                      col.hideOnMobile ? "hidden lg:table-cell" : ""
                    } ${col.width ?? ""} ${col.headerClassName ?? ""}`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedRows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-[14px] py-[10px]">
                    {emptyState ?? (
                      <div className="text-[12px] text-[var(--color-text-tertiary)] text-center py-8">
                        No records found.
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                pagedRows.map((row) => (
                  <tr
                    key={rowKey(row)}
                    className="border-b border-[var(--color-border)] last:border-b-0 even:bg-[var(--color-surface-raised)]"
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-[14px] py-[10px] text-[12px] align-middle ${
                          col.hideOnMobile ? "hidden lg:table-cell" : ""
                        } ${col.cellClassName ?? ""}`}
                      >
                        {col.cell(row)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pageSize && totalPages > 1 && (
        <ClPagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          pageSize={pageSize}
          totalItems={rows.length}
          className="mt-3"
        />
      )}
    </div>
  );
}
