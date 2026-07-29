"use client";

import { InputHTMLAttributes, forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface ClPasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const ClPasswordInput = forwardRef<HTMLInputElement, ClPasswordInputProps>(
  ({ error, className = "", ...props }, ref) => {
    const [visible, setVisible] = useState(false);

    return (
      <div className="flex flex-col gap-1">
        <div className="relative">
          <input
            ref={ref}
            type={visible ? "text" : "password"}
            className={`
              h-10 px-3 pr-[44px] rounded-[8px] bg-[var(--color-surface-raised)]
              border text-[14px] text-[var(--color-text-primary)]
              outline-none w-full transition-[border-color] duration-[150ms] ease-[cubic-bezier(0.16,1,0.3,1)]
              focus:border-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]
              disabled:opacity-40 disabled:cursor-not-allowed
              placeholder:text-[var(--color-text-tertiary)]
              ${error ? "border-[var(--color-error)]" : "border-[var(--color-border)]"}
              ${className}
            `.trim()}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] cursor-pointer bg-transparent border-none p-0 transition-colors"
            aria-label={visible ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {visible ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
          </button>
        </div>
        {error && <span className="text-[12px] text-[var(--color-error)]">{error}</span>}
      </div>
    );
  },
);

ClPasswordInput.displayName = "ClPasswordInput";