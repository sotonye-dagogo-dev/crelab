"use client";

import { HTMLAttributes, useEffect, useRef, forwardRef } from "react";

interface ClDialogProps extends HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onClose: () => void;
}

export const ClDialog = forwardRef<HTMLDivElement, ClDialogProps>(
  ({ open, onClose, className = "", children, ...props }, ref) => {
    const backdropRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (open) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
      }
      return () => {
        document.body.style.overflow = "";
      };
    }, [open]);

    useEffect(() => {
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      if (open) window.addEventListener("keydown", handleEsc);
      return () => window.removeEventListener("keydown", handleEsc);
    }, [open, onClose]);

    if (!open) return null;

    return (
      <div
        ref={backdropRef}
        className="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(10,10,10,0.85)] backdrop-blur-[4px] p-4"
        onClick={(e) => {
          if (e.target === backdropRef.current) onClose();
        }}
      >
        <div
          ref={ref}
          className={`
            w-full max-w-[420px] max-h-[90vh] overflow-y-auto
            rounded-[20px] border border-[var(--color-border)]
            bg-[var(--color-surface)] p-8 relative
            ${className}
          `.trim()}
          {...props}
        >
          {children}
        </div>
      </div>
    );
  },
);

ClDialog.displayName = "ClDialog";
