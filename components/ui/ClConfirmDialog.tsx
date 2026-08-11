"use client";

import { ClDialog } from "./ClDialog";
import { ClButton } from "./ClButton";
import { AlertTriangle } from "lucide-react";

interface ClConfirmDialogProps {
  open: boolean;
  /** Short title shown above the message */
  title?: string;
  /** Body copy — what is about to happen and any consequences */
  message: string;
  /** Optional detail line (e.g. how many items are affected) */
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** When true the confirm button uses danger styling */
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Universal destructive-action confirmation dialog. Adopt for any flow that
 * needs a confirm-before-destroy step (admin deletes, media removal, etc.).
 */
export function ClConfirmDialog({
  open,
  title = "Are you sure?",
  message,
  detail,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}: ClConfirmDialogProps) {
  return (
    <ClDialog open={open} onClose={onCancel}>
      <div className="flex flex-col items-center text-center">
        <div className="w-11 h-11 rounded-full bg-[var(--color-error)]/10 flex items-center justify-center mb-4">
          <AlertTriangle size={20} strokeWidth={1.8} color="var(--color-error)" />
        </div>

        <h3 className="font-[family-name:var(--font-display)] font-bold text-[18px]">
          {title}
        </h3>

        <p className="mt-2 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          {message}
        </p>

        {detail && (
          <p className="mt-2 text-[12px] text-[var(--color-text-tertiary)]">
            {detail}
          </p>
        )}

        <div className="flex items-center gap-3 mt-6 w-full">
          <ClButton
            variant={danger ? "primary" : "accent-outlined"}
            fullWidth
            loading={loading}
            onClick={onConfirm}
            className={danger ? "!bg-[var(--color-error)] hover:!bg-[var(--color-error)]" : ""}
          >
            {confirmLabel}
          </ClButton>
          <ClButton variant="ghost" fullWidth onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </ClButton>
        </div>
      </div>
    </ClDialog>
  );
}
