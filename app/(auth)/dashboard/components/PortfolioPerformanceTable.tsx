import Link from "next/link";
import { Play, FileText, Image as ImageIcon } from "lucide-react";
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

export function PortfolioPerformanceTable({
  rows,
}: {
  rows: IPortfolioPerformanceRow[];
}) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-8 text-[13px] text-[var(--color-text-tertiary)]">
        No portfolio items yet — add work to see performance here.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr>
              {["", "Title", "Type", "Plays", "Clicks", "Conversion", "Actions"].map(
                (h, i) => (
                  <th
                    key={i}
                    className="whitespace-nowrap bg-[var(--color-surface-raised)] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]"
                  >
                    {h}
                  </th>
                ),
              )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-[var(--color-border)] odd:bg-transparent even:bg-[var(--color-surface-raised)]"
            >
              <td className="px-4 py-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-[8px] bg-[var(--color-surface-raised)] text-[var(--color-text-tertiary)]">
                  {typeIcon(row.mimeType)}
                </div>
              </td>
              <td className="px-4 py-3 text-[var(--color-text-primary)]">
                <div className="text-[13px] font-medium">{row.title}</div>
                <div className="text-[11px] text-[var(--color-text-tertiary)]">
                  {typeLabel(row.mimeType)}
                </div>
              </td>
              <td className="px-4 py-3 text-[11px] text-[var(--color-text-tertiary)]">
                {typeLabel(row.mimeType)}
              </td>
              <td className="px-4 py-3 tabular-nums text-[var(--color-text-primary)]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {row.plays.toLocaleString()}
              </td>
              <td className="px-4 py-3 tabular-nums text-[var(--color-text-primary)]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {row.clicks.toLocaleString()}
              </td>
              <td className="px-4 py-3 tabular-nums text-[var(--color-text-primary)]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {row.conversionRate}%
              </td>
              <td className="px-4 py-3">
                <Link
                  href="/profile/media"
                  className="text-[12px] text-[var(--color-text-secondary)] no-underline transition-colors duration-150 hover:text-[var(--color-text-primary)]"
                >
                  Manage
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
