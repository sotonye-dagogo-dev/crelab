"use client";

import { useState, useCallback } from "react";
import { ClButton } from "@/components/ui";
import { ClDialog } from "@/components/ui";
import { useToast } from "@/lib/toast";
import { CheckCheck, X, RotateCcw } from "lucide-react";

export interface BatchAction<T = string> {
  label: string;
  variant?: "primary" | "outlined" | "ghost" | "accent-outlined";
  confirmTitle?: string;
  confirmMessage: string;
  danger?: boolean;
  execute: (ids: T[]) => Promise<void>;
  undo?: (ids: T[]) => Promise<void>;
}

interface BatchOperationsProps<T = string> {
  ids: T[];
  selectedIds: Set<T>;
  onToggle: (id: T) => void;
  onSelectAll: () => void;
  onInvert: () => void;
  onClear: () => void;
  actions: BatchAction<T>[];
  /** Render the checkbox cell for a row */
  renderCheckbox?: (id: T) => React.ReactNode;
}

export function useBatchSelect<T = string>() {
  const [selectedIds, setSelectedIds] = useState<Set<T>>(new Set());

  const toggleSelect = useCallback((id: T) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: T[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const invertSelect = useCallback((ids: T[]) => {
    setSelectedIds((prev) => {
      const next = new Set<T>();
      for (const id of ids) {
        if (!prev.has(id)) next.add(id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return { selectedIds, toggleSelect, selectAll, invertSelect, clearSelection, setSelectedIds };
}

export function BatchToolbar<T = string>({
  ids,
  selectedIds,
  onToggle,
  onSelectAll,
  onInvert,
  onClear,
  actions,
  renderCheckbox,
}: BatchOperationsProps<T>) {
  const { toast } = useToast();
  const [confirmAction, setConfirmAction] = useState<BatchAction<T> | null>(null);
  const [executing, setExecuting] = useState(false);

  const selectedCount = selectedIds.size;
  const allSelected = selectedCount === ids.length && ids.length > 0;

  const handleExecute = async (action: BatchAction<T>) => {
    setExecuting(true);
    const selected = Array.from(selectedIds);
    try {
      await action.execute(selected);
      toast(`${action.label} — ${selected.length} item(s) processed`, "success", action.undo
        ? {
            label: "Undo",
            onClick: async () => {
              try {
                await action.undo!(selected);
                toast("Undo successful", "info");
              } catch {
                toast("Undo failed", "error");
              }
            },
          }
        : undefined,
      );
      onClear();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Action failed", "error");
    } finally {
      setExecuting(false);
      setConfirmAction(null);
    }
  };

  return (
    <>
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 mb-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[10px] text-[13px]">
          <span className="font-semibold text-[var(--color-text-primary)]">
            {selectedCount} selected
          </span>

          <div className="flex items-center gap-1.5 ml-2">
            <button
              onClick={() => {
                if (allSelected) onClear();
                else onSelectAll();
              }}
              className="flex items-center gap-1 text-[12px] text-[var(--color-accent)] cursor-pointer bg-transparent border-none p-1 hover:opacity-80"
            >
              <CheckCheck size={14} strokeWidth={1.5} />
              {allSelected ? "Deselect All" : "Select All"}
            </button>

            <button
              onClick={() => onInvert()}
              className="flex items-center gap-1 text-[12px] text-[var(--color-text-secondary)] cursor-pointer bg-transparent border-none p-1 hover:opacity-80"
            >
              <RotateCcw size={14} strokeWidth={1.5} />
              Invert
            </button>

            <button
              onClick={onClear}
              className="flex items-center gap-1 text-[12px] text-[var(--color-text-tertiary)] cursor-pointer bg-transparent border-none p-1 hover:opacity-80"
            >
              <X size={14} strokeWidth={1.5} />
              Clear
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {actions.map((action) => (
              <ClButton
                key={action.label}
                variant={action.variant ?? "outlined"}
                size="sm"
                onClick={() => setConfirmAction(action)}
                disabled={executing}
              >
                {action.label}
              </ClButton>
            ))}
          </div>
        </div>
      )}

      <ClDialog
        open={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
      >
        {confirmAction && (
          <div className="space-y-4">
            <h3 className="font-[family-name:var(--font-display)] font-bold text-[18px]">
              {confirmAction.confirmTitle ?? `Batch ${confirmAction.label}`}
            </h3>
            <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
              {confirmAction.confirmMessage}
            </p>
            <p className="text-[12px] text-[var(--color-text-tertiary)]">
              {selectedCount} item(s) will be affected.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <ClButton
                variant={confirmAction.danger ? "primary" : "accent-outlined"}
                onClick={() => handleExecute(confirmAction)}
                loading={executing}
              >
                {confirmAction.label}
              </ClButton>
              <ClButton variant="ghost" onClick={() => setConfirmAction(null)}>
                Cancel
              </ClButton>
            </div>
          </div>
        )}
      </ClDialog>
    </>
  );
}
