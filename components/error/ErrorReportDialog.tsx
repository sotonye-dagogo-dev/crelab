"use client";

import { ClButton, ClDialog } from "@/components/ui";
import { usePlatformConfig } from "@/lib/config-context";
import { AlertTriangle, X } from "lucide-react";

interface ErrorReportDialogProps {
  open: boolean;
  /** User chose to file a report (payload is already stashed by the caller). */
  onReport: () => void;
  /** User chose to keep using the platform — closes without trapping them. */
  onContinue: () => void;
}

/**
 * F4.3 — Non-blocking error popup.
 *
 * Copy is fully config-driven (`bugReport.*`). The dialog is dismissible three
 * ways (Continue, ✕, Escape / backdrop click) so a captured error can never
 * trap the user.
 */
export function ErrorReportDialog({ open, onReport, onContinue }: ErrorReportDialogProps) {
  const { bugReport } = usePlatformConfig();

  const title = bugReport?.popupTitle || "Something went wrong";
  const message =
    bugReport?.popupMessage ||
    "We hit an unexpected error. Reporting it helps us fix it faster.";
  const reportLabel = bugReport?.reportButtonLabel || "Report this error";
  const continueLabel = bugReport?.continueButtonLabel || "Keep browsing";

  return (
    <ClDialog open={open} onClose={onContinue} role="alertdialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        onClick={onContinue}
        aria-label="Close"
        className="absolute top-4 right-4 rounded-full p-1.5 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg)] transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex flex-col items-center text-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-error)]/10">
          <AlertTriangle className="h-6 w-6 text-[var(--color-error)]" />
        </div>

        <div className="space-y-2">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold tracking-[-0.02em]">
            {title}
          </h2>
          <p className="text-[13px] leading-relaxed text-[var(--color-text-secondary)]">{message}</p>
        </div>

        <div className="flex w-full flex-col gap-2 pt-1 sm:flex-row">
          <ClButton type="button" fullWidth onClick={onReport}>
            {reportLabel}
          </ClButton>
          <ClButton type="button" variant="outlined" fullWidth onClick={onContinue}>
            {continueLabel}
          </ClButton>
        </div>
      </div>
    </ClDialog>
  );
}
