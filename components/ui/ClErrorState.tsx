"use client";

import { AlertTriangle } from "lucide-react";

type ClErrorStateProps = {
  title?: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
};

export function ClErrorState({
  title = "Something went wrong",
  message = "Please try again later.",
  action,
  className = "",
}: ClErrorStateProps) {
  return (
    <div className={`text-center py-16 px-6 ${className}`}>
      <div className="flex flex-col items-center gap-4">
        <AlertTriangle
          size={40}
          strokeWidth={1.5}
          className="text-[var(--color-error)] opacity-70"
        />
        <div>
          <div className="font-[family-name:var(--font-display)] text-[20px] font-bold text-[var(--color-error)]">
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
    </div>
  );
}