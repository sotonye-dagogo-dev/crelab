import { InputHTMLAttributes, forwardRef } from "react";

interface ClInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const ClInput = forwardRef<HTMLInputElement, ClInputProps>(
  ({ error, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        <input
          ref={ref}
          className={`
            h-10 px-3 rounded-[8px] bg-[var(--color-surface-raised)]
            border text-[14px] text-[var(--color-text-primary)]
            outline-none w-full transition-[border-color] duration-[150ms] ease-[cubic-bezier(0.16,1,0.3,1)]
            focus:border-[var(--color-accent)]
            disabled:opacity-40 disabled:cursor-not-allowed
            placeholder:text-[var(--color-text-tertiary)]
            ${error ? "border-[var(--color-error)]" : "border-[var(--color-border)]"}
            ${className}
          `.trim()}
          {...props}
        />
        {error && <span className="text-[12px] text-[var(--color-error)]">{error}</span>}
      </div>
    );
  },
);

ClInput.displayName = "ClInput";
