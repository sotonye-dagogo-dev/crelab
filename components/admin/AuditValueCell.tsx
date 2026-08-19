"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Eye, EyeOff } from "lucide-react";
import { describeAuditValue, summarizeAuditValue } from "@/lib/audit";

/**
 * Universal audit value cell: renders an old/new value from the audit trail as
 * a collapsed single-line summary and lets the operator expand it to the full
 * serialised value (HTML template bodies, config objects, etc.). Adopted by the
 * config "Recent Changes" table and the admin audit-log page so long values are
 * never dumped into table cells.
 */
export function AuditValueCell({ value }: { value: unknown }) {
  const { summary, full, truncated } = summarizeAuditValue(value);
  const [expanded, setExpanded] = useState(false);

  if (!truncated) {
    return (
      <span className="text-[12px] text-[var(--color-text-secondary)] break-words min-w-0 block">
        {full || "—"}
      </span>
    );
  }

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-accent)] cursor-pointer bg-transparent border-none p-0 whitespace-nowrap flex-shrink-0"
          aria-expanded={expanded}
        >
          {expanded ? <EyeOff size={12} strokeWidth={2} /> : <Eye size={12} strokeWidth={2} />}
          {expanded ? "Collapse" : "View"}
        </button>
        <span className="text-[10px] text-[var(--color-text-tertiary)] whitespace-nowrap flex-shrink-0">
          {describeAuditValue(value)}
        </span>
      </div>
      {expanded ? (
        <pre className="mt-2 max-h-[180px] overflow-y-auto rounded-[8px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] p-3 text-[11px] font-[family-name:var(--font-mono)] leading-relaxed break-all whitespace-pre-wrap text-[var(--color-text-secondary)]">
          {full}
        </pre>
      ) : (
        <span className="text-[12px] text-[var(--color-text-secondary)] break-words min-w-0 block mt-1">
          {summary}
        </span>
      )}
    </div>
  );
}

/** Toggle button used in headers/rows that open a full-value panel. */
export function AuditValueToggle({
  expanded,
  onClick,
}: {
  expanded: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-accent)] cursor-pointer bg-transparent border-none p-0"
      aria-expanded={expanded}
    >
      {expanded ? <ChevronDown size={12} strokeWidth={2} /> : <ChevronRight size={12} strokeWidth={2} />}
      {expanded ? "Hide" : "Show"}
    </button>
  );
}