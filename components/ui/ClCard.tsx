import { HTMLAttributes, forwardRef } from "react";

interface ClCardProps extends HTMLAttributes<HTMLDivElement> {
  raised?: boolean;
}

export const ClCard = forwardRef<HTMLDivElement, ClCardProps>(
  ({ raised = false, className = "", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          rounded-[12px] border border-[var(--color-border)]
          ${raised ? "bg-[var(--color-surface-raised)]" : "bg-[var(--color-surface)]"}
          ${className}
        `.trim()}
        {...props}
      >
        {children}
      </div>
    );
  },
);

ClCard.displayName = "ClCard";
