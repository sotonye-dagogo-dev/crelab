import { forwardRef, type ReactNode } from "react";
import { Info } from "lucide-react";

/**
 * ClInfoTip — the design system's info-tooltip primitive.
 *
 * WHY: money-path surfaces (pay panel, escrow timeline, wallet, finance
 * stats) need to explain *why* a number or action is what it is, but the only
 * affordance available until now was a native `title` attribute — invisible
 * on touch, unstyled, and inconsistent with the design tokens. This primitive
 * gives one accessible, token-styled hover/focus tooltip everywhere.
 *
 * Accessible by construction: it renders a focusable <button> (keyboard
 * reachable, announces via aria-label), and the tooltip is shown on BOTH
 * hover and focus-within so keyboard users get the same information as mouse
 * users. Pure CSS state (group-hover / group-focus-within) — no JS listeners,
 * no popover library, no new dependency.
 *
 * Usage: `<ClInfoTip label="How fees work">Copy shown on hover/focus</ClInfoTip>`
 * — typically placed next to the heading or stat it explains.
 */
export interface ClInfoTipProps {
  /** Tooltip body (plain text or nodes). */
  children: ReactNode;
  /** Accessible name for the trigger button (screen readers + tooltip a11y). */
  label?: string;
  /** Which side the tooltip appears on relative to the trigger. */
  placement?: "top" | "bottom";
  /** Extra classes for the outer wrapper (spacing/alignment). */
  className?: string;
}

const placementStyles = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
} as const;

export const ClInfoTip = forwardRef<HTMLButtonElement, ClInfoTipProps>(
  ({ children, label = "More info", placement = "top", className = "" }, ref) => {
    return (
      <span className={`group relative inline-flex align-middle ${className}`.trim()}>
        <button
          ref={ref}
          type="button"
          aria-label={label}
          className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] transition-colors cursor-help shrink-0"
        >
          <Info size={11} strokeWidth={2.5} aria-hidden="true" />
        </button>
        <span
          role="tooltip"
          className={`pointer-events-none absolute z-50 w-max max-w-[240px] rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-2.5 py-1.5 text-[11px] leading-snug text-[var(--color-text-secondary)] shadow-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 ${placementStyles[placement]}`}
        >
          {children}
        </span>
      </span>
    );
  },
);

ClInfoTip.displayName = "ClInfoTip";
