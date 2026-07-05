import { HTMLAttributes, forwardRef } from "react";

type BadgeVariant = "accent" | "success" | "warning" | "error" | "info" | "default";

interface ClBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  accent: "bg-[var(--color-accent-muted)] text-[var(--color-accent)] border-[var(--color-accent)]",
  success: "bg-[rgba(74,222,128,0.1)] text-[var(--color-success)] border-[var(--color-success)]",
  warning: "bg-[rgba(250,204,21,0.1)] text-[var(--color-warning)] border-[var(--color-warning)]",
  error: "bg-[rgba(248,113,113,0.1)] text-[var(--color-error)] border-[var(--color-error)]",
  info: "bg-[rgba(96,165,250,0.1)] text-[var(--color-info)] border-[var(--color-info)]",
  default: "bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] border-[var(--color-border)]",
};

export const ClBadge = forwardRef<HTMLSpanElement, ClBadgeProps>(
  ({ variant = "default", className = "", children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={`
          inline-flex items-center px-2 py-0.5 rounded-[9999px] text-[11px] font-medium border
          ${variantStyles[variant]}
          ${className}
        `.trim()}
        {...props}
      >
        {children}
      </span>
    );
  },
);

ClBadge.displayName = "ClBadge";
