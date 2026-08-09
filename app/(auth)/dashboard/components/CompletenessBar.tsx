import Link from "next/link";
import type { IProfileCompleteness } from "@/types";

export function CompletenessBar({ completeness }: { completeness: IProfileCompleteness }) {
  const circumference = 2 * Math.PI * 20;
  const offset = circumference * (1 - completeness.percent / 100);

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
      <div className="flex items-center gap-4">
        <div className="relative h-12 w-12">
          <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90">
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke="var(--color-border-mid)"
              strokeWidth="4"
            />
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.16,1,0.3,1)" }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-bold text-[16px] text-[var(--color-accent)] tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {completeness.percent}%
          </span>
        </div>
        <div>
          <div className="text-[14px] font-semibold text-[var(--color-text-primary)]">
            Profile completeness
          </div>
          <div className="mt-0.5 text-[12px] text-[var(--color-text-tertiary)]">
            {completeness.completedItems} of {completeness.totalItems} items completed
          </div>
        </div>
      </div>
      <Link
        href="/profile/edit"
        className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[var(--color-accent)] px-4 text-sm font-semibold text-[var(--color-text-inverse)] no-underline transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[var(--color-accent-dim)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
      >
        Complete your profile
      </Link>
    </div>
  );
}
