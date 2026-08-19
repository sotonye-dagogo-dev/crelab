import Link from "next/link";
import { Play, FileText, Image as ImageIcon } from "lucide-react";
import { ClDataTable, type ClColumn } from "@/components/ui";
import type { IPortfolioPerformanceRow } from "@/types";

function typeIcon(mimeType: string) {
  if (mimeType.startsWith("video/")) return <Play size={16} strokeWidth={2} />;
  if (mimeType.startsWith("image/")) return <ImageIcon size={16} strokeWidth={2} />;
  return <FileText size={16} strokeWidth={2} />;
}

function typeLabel(mimeType: string) {
  if (mimeType.startsWith("video/")) return "VIDEO";
  if (mimeType.startsWith("image/")) return "IMAGE";
  if (mimeType === "application/pdf") return "PDF";
  return "FILE";
}

const columns: ClColumn<IPortfolioPerformanceRow>[] = [
  {
    key: "thumb",
    header: "",
    width: "w-[56px]",
    cell: (row) => (
      <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[var(--color-surface-raised)] text-[var(--color-text-tertiary)]">
        {typeIcon(row.mimeType)}
      </div>
    ),
  },
  {
    key: "title",
    header: "Title",
    cell: (row) => (
      <div className="min-w-0">
        <div className="text-[13px] font-medium truncate">{row.title}</div>
        <div className="text-[11px] text-[var(--color-text-tertiary)]">{typeLabel(row.mimeType)}</div>
      </div>
    ),
  },
  {
    key: "type",
    header: "Type",
    hideOnMobile: true,
    cell: (row) => <span className="text-[11px] text-[var(--color-text-tertiary)]">{typeLabel(row.mimeType)}</span>,
  },
  {
    key: "plays",
    header: "Plays",
    cell: (row) => (
      <span className="text-[12px] font-[family-name:var(--font-mono)] tabular-nums text-[var(--color-text-primary)]">
        {row.plays.toLocaleString()}
      </span>
    ),
  },
  {
    key: "clicks",
    header: "Clicks",
    cell: (row) => (
      <span className="text-[12px] font-[family-name:var(--font-mono)] tabular-nums text-[var(--color-text-primary)]">
        {row.clicks.toLocaleString()}
      </span>
    ),
  },
  {
    key: "conversion",
    header: "Conversion",
    cell: (row) => (
      <span className="text-[12px] font-[family-name:var(--font-mono)] tabular-nums text-[var(--color-text-primary)]">
        {row.conversionRate}%
      </span>
    ),
  },
  {
    key: "actions",
    header: "Actions",
    cell: () => (
      <Link
        href="/profile/media"
        className="text-[12px] text-[var(--color-text-secondary)] no-underline transition-colors duration-150 hover:text-[var(--color-text-primary)]"
      >
        Manage
      </Link>
    ),
  },
];

export function PortfolioPerformanceTable({ rows }: { rows: IPortfolioPerformanceRow[] }) {
  return (
    <ClDataTable
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      pageSize={5}
      emptyState={
        <div className="text-center py-8 text-[13px] text-[var(--color-text-tertiary)]">
          No portfolio items yet — add work to see performance here.
        </div>
      }
    />
  );
}