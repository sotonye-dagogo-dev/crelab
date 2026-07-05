import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "outlined" | "ghost" | "accent-outlined";
type Size = "sm" | "default" | "lg";

interface ClButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-[var(--color-accent)] text-[var(--color-text-inverse)] hover:bg-[var(--color-accent-dim)] active:bg-[var(--color-accent-dim)]",
  outlined:
    "bg-transparent text-[var(--color-text-primary)] border border-[var(--color-border-mid)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]",
  ghost:
    "bg-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] active:bg-[var(--color-surface-raised)]",
  "accent-outlined":
    "bg-transparent text-[var(--color-accent)] border border-[var(--color-accent)] hover:bg-[var(--color-accent-muted)]",
};

const sizeStyles: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  default: "h-10 px-4 text-[14px]",
  lg: "h-12 px-6 text-[15px]",
};

export const ClButton = forwardRef<HTMLButtonElement, ClButtonProps>(
  (
    {
      variant = "primary",
      size = "default",
      loading = false,
      fullWidth = false,
      className = "",
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center gap-2 border border-transparent rounded-[8px] cursor-pointer
          font-semibold no-underline whitespace-nowrap transition-[background,border-color,color] duration-[150ms] ease-[cubic-bezier(0.16,1,0.3,1)]
          active:scale-[0.98]
          disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? "w-full" : ""}
          ${loading ? "relative" : ""}
          ${className}
        `.trim()}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <span className="absolute w-4 h-4 border-2 border-transparent rounded-full animate-spin" />
        )}
        <span className={loading ? "invisible" : ""}>{children}</span>
      </button>
    );
  },
);

ClButton.displayName = "ClButton";
