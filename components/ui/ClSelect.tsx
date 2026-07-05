import { SelectHTMLAttributes, forwardRef } from "react";

interface ClSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

export const ClSelect = forwardRef<HTMLSelectElement, ClSelectProps>(
  ({ error, className = "", children, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        <select
          ref={ref}
          className={`
            h-10 px-3 rounded-[8px] bg-[var(--color-surface-raised)]
            border text-[14px] text-[var(--color-text-primary)]
            outline-none w-full transition-[border-color] duration-[150ms] ease-[cubic-bezier(0.16,1,0.3,1)]
            focus:border-[var(--color-accent)]
            disabled:opacity-40 disabled:cursor-not-allowed
            ${error ? "border-[var(--color-error)]" : "border-[var(--color-border)]"}
            ${className}
          `.trim()}
          {...props}
        >
          {children}
        </select>
        {error && <span className="text-[12px] text-[var(--color-error)]">{error}</span>}
      </div>
    );
  },
);

ClSelect.displayName = "ClSelect";
