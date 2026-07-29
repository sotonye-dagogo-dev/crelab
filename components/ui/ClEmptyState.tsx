"use client";

import { Inbox } from "lucide-react";

type ClEmptyStateProps = {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
};

export function ClEmptyState({
  title = "Nothing here yet",
  message = "Content will appear here once available.",
  icon,
  action,
  className = "",
}: ClEmptyStateProps) {
  return (
    <div className={`text-center py-16 px-6 flex flex-col gap-4 justify-center items-center ${className}`}>
      <div className="opacity-30">
        {icon ?? <Inbox size={48} strokeWidth={1.5} />}
      </div>
      <div>
        <div className="font-[family-name:var(--font-display)] text-[20px] font-bold text-[var(--color-text-primary)]">
          {title}
        </div>
        <div className="font-[family-name:var(--font-body)] text-[14px] text-[var(--color-text-secondary)] mt-2">
          {message}
        </div>
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-2 h-10 px-4 rounded-[8px] bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-semibold text-[13px] cursor-pointer border-none transition-colors hover:bg-[var(--color-accent-dim)]"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}