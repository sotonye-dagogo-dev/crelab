"use client";

import { HTMLAttributes, useEffect, forwardRef } from "react";

type Side = "right" | "bottom";

interface ClSheetProps extends HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onClose: () => void;
  side?: Side;
}

export const ClSheet = forwardRef<HTMLDivElement, ClSheetProps>(
  ({ open, onClose, side = "right", className = "", children, ...props }, ref) => {
    useEffect(() => {
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      if (open) {
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", handleEsc);
      } else {
        document.body.style.overflow = "";
      }
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleEsc);
      };
    }, [open, onClose]);

    if (!open) return null;

    const positionStyles =
      side === "right"
        ? "top-0 right-0 h-full max-w-[480px] w-full"
        : "bottom-0 left-0 right-0 max-h-[90vh] rounded-t-[20px]";

    return (
      <>
        <div
          className="fixed inset-0 z-[999] bg-[rgba(10,10,10,0.6)]"
          onClick={onClose}
        />
        <div
          ref={ref}
          className={`
            fixed z-[1000] bg-[var(--color-surface)]
            border border-[var(--color-border)]
            overflow-y-auto
            focus-visible:outline-none
            ${positionStyles}
            ${className}
          `.trim()}
          {...props}
        >
          {children}
        </div>
      </>
    );
  },
);

ClSheet.displayName = "ClSheet";
