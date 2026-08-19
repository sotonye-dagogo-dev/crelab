"use client";

import { HTMLAttributes, ReactNode, useEffect, useRef } from "react";
import { X } from "lucide-react";

type ModalSize = "sm" | "md" | "lg" | "xl";

interface ClModalProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  open: boolean;
  onClose: () => void;
  /** Optional header shown above the body with a close button */
  title?: ReactNode;
  /** Optional muted line under the title */
  description?: ReactNode;
  /** Sticky footer bar (e.g. actions). When absent the footer is omitted. */
  footer?: ReactNode;
  size?: ModalSize;
}

const SIZE_STYLES: Record<ModalSize, string> = {
  sm: "max-w-[420px]",
  md: "max-w-[560px]",
  lg: "max-w-[720px]",
  xl: "max-w-[960px]",
};

/**
 * Universal modal — the single wrapper every overlay on the platform uses so
 * behaviour is consistent: it can never escape the viewport (max height + inner
 * scroll for overflow), closes on Escape / backdrop click, locks body scroll,
 * and carries the standard surface padding. Adopt anywhere a dialog or editor
 * panel is shown instead of rolling custom `fixed inset-0` overlays.
 */
export function ClModal({
  open,
  onClose,
  title,
  description,
  footer,
  size = "md",
  className = "",
  children,
  ...props
}: ClModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", handleEsc);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(10,10,10,0.85)] backdrop-blur-[4px] p-4 sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={panelRef}
        className={`
          w-full ${SIZE_STYLES[size]}
          max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)]
          flex flex-col
          rounded-[16px] border border-[var(--color-border)]
          bg-[var(--color-surface)] shadow-xl
          ${className}
        `.trim()}
        {...props}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-[var(--color-border)] flex-shrink-0">
            <div className="min-w-0">
              {title && (
                <h3 className="font-[family-name:var(--font-display)] font-bold text-[18px] leading-tight">
                  {title}
                </h3>
              )}
              {description && (
                <div className="text-[12px] text-[var(--color-text-secondary)] mt-1 leading-relaxed">
                  {description}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center w-8 h-8 rounded-[8px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)] cursor-pointer border-none flex-shrink-0"
              aria-label="Close"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>
        )}

        <div className="px-5 sm:px-6 py-5 overflow-y-auto overscroll-contain min-h-0">
          {children}
        </div>

        {footer && (
          <div className="px-5 sm:px-6 py-4 border-t border-[var(--color-border)] flex flex-wrap items-center justify-end gap-2 bg-[var(--color-surface-raised)] rounded-b-[16px] flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

ClModal.displayName = "ClModal";
