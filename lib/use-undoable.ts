"use client";

import { useCallback } from "react";
import { useToast } from "@/lib/toast";

interface UndoableOptions {
  /** The destructive/irreversible-ish action to run */
  execute: () => Promise<void>;
  /** Optional inverse action wired to the "Undo" toast action */
  undo?: () => Promise<void>;
  /** Toast shown on success */
  successMessage?: string;
  /** Toast shown on failure */
  errorMessage?: string;
  undoLabel?: string;
}

/**
 * Runs a (destructive) action and surfaces a toast. When an `undo` callback is
 * provided the toast includes an "Undo" action that reverts the operation.
 * Universal helper for admin/user destructive flows.
 */
export function useUndoable() {
  const { toast } = useToast();

  return useCallback(
    async (opts: UndoableOptions) => {
      try {
        await opts.execute();
        toast(
          opts.successMessage ?? "Action completed",
          "success",
          opts.undo
            ? {
                label: opts.undoLabel ?? "Undo",
                onClick: async () => {
                  try {
                    await opts.undo!();
                    toast("Undo successful", "info");
                  } catch {
                    toast("Undo failed", "error");
                  }
                },
              }
            : undefined,
        );
      } catch (err) {
        toast(
          opts.errorMessage ??
            (err instanceof Error ? err.message : "Action failed"),
          "error",
        );
      }
    },
    [toast],
  );
}
