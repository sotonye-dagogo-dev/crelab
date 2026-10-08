"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClButton, ClModal } from "@/components/ui";
import { useToast } from "@/lib/toast";
import { invertSelection, type EmailRecipient } from "@/lib/email-batch";

type RoleFilter = "ALL" | "CLIENT" | "PROVIDER" | "ADMIN";
type ConsentFilter = "ALL" | "SUBSCRIBERS";

const selectClass =
  "h-9 px-2 rounded-[8px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[13px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]";

const inputClass =
  "h-9 px-3 rounded-[8px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[13px] text-[var(--color-text-primary)] outline-none w-full focus:border-[var(--color-accent)]";

const quickButton = (active: boolean) =>
  `h-8 px-3 rounded-full text-[12px] font-semibold cursor-pointer border transition-colors duration-150 ${
    active
      ? "bg-[var(--color-accent-muted)] text-[var(--color-accent)] border-[var(--color-accent)]/40"
      : "bg-transparent text-[var(--color-text-secondary)] border-[var(--color-border-mid)] hover:bg-[var(--color-surface-raised)]"
  }`.trim();

interface RecipientsResponse {
  success: boolean;
  data: EmailRecipient[];
  total: number;
  error?: string;
}

/**
 * Batch recipient picker for admin email sends. Admins search/filter the user
 * base, tick checkboxes, and use select-all-visible / invert / clear / undo
 * plus quick filters (first 100, only creators, only brands, only subscribers).
 */
export function EmailBatchSendDialog({
  open,
  templateKey,
  onClose,
  onSent,
}: {
  open: boolean;
  templateKey: string;
  onClose: () => void;
  onSent: (message: string) => void;
}) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [role, setRole] = useState<RoleFilter>("ALL");
  const [consent, setConsent] = useState<ConsentFilter>("ALL");
  const [limit, setLimit] = useState<number>(100);
  const [selected, setSelected] = useState<string[]>([]);
  const [undoStack, setUndoStack] = useState<string[][]>([]);
  const [sending, setSending] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search]);

  // Reset picker state each time it opens for a template.
  useEffect(() => {
    if (open) {
      setSearch("");
      setDebouncedSearch("");
      setRole("ALL");
      setConsent("ALL");
      setLimit(100);
      setSelected([]);
      setUndoStack([]);
    }
  }, [open, templateKey]);

  const queryKey = useMemo(
    () => ["admin-email-recipients", debouncedSearch, role, consent, limit],
    [debouncedSearch, role, consent, limit],
  );

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey,
    enabled: open,
    queryFn: async (): Promise<RecipientsResponse> => {
      const params = new URLSearchParams({
        search: debouncedSearch,
        role,
        consent: consent === "SUBSCRIBERS" ? "marketing" : "all",
        limit: String(limit),
      });
      const res = await fetch(`/api/admin/email/recipients?${params.toString()}`);
      const json = (await res.json()) as RecipientsResponse;
      if (!json.success) throw new Error(json.error ?? "Failed to load recipients");
      return json;
    },
  });

  const recipients: EmailRecipient[] = useMemo(() => data?.data ?? [], [data]);
  const total = data?.total ?? 0;
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const pushUndo = useCallback((prev: string[]) => {
    setUndoStack((stack) => [...stack.slice(-9), [...prev]]);
  }, []);

  const toggleOne = useCallback(
    (id: string) => {
      pushUndo(selected);
      setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    },
    [pushUndo, selected],
  );

  const selectAllVisible = useCallback(() => {
    pushUndo(selected);
    setSelected((prev) => {
      const set = new Set(prev);
      for (const r of recipients) set.add(r.id);
      return [...set];
    });
  }, [pushUndo, recipients, selected]);

  const clearSelection = useCallback(() => {
    if (selected.length === 0) return;
    pushUndo(selected);
    setSelected([]);
  }, [pushUndo, selected]);

  const invertVisible = useCallback(() => {
    pushUndo(selected);
    const visibleIds = recipients.map((r) => r.id);
    const inverted = invertSelection(visibleIds, selectedSet);
    // Keep off-screen selections, replace the visible slice with its inverse:
    // drop visible ids from the selection, then add the inverted ones.
    const visibleSet = new Set(visibleIds);
    const kept = selected.filter((id) => !visibleSet.has(id));
    setSelected([...kept, ...inverted]);
  }, [pushUndo, recipients, selected, selectedSet]);

  const undoSelect = useCallback(() => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack;
      const prev = stack[stack.length - 1];
      setSelected(prev);
      return stack.slice(0, -1);
    });
  }, []);

  const applyQuickFilter = useCallback(
    (kind: "first100" | "creators" | "brands" | "subscribers") => {
      if (kind === "first100") {
        setLimit(100);
        setRole("ALL");
        setConsent("ALL");
      } else if (kind === "creators") {
        setRole("PROVIDER");
        setLimit(500);
      } else if (kind === "brands") {
        setRole("CLIENT");
        setLimit(500);
      } else {
        setConsent("SUBSCRIBERS");
        setLimit(500);
      }
    },
    [],
  );

  const handleSend = useCallback(async () => {
    if (selected.length === 0) {
      toast("Select at least one recipient", "error");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/admin/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateKey, recipientIds: selected }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Batch send failed");
      onSent(json.message ?? `Batch send complete: ${json.sent} sent.`);
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Batch send failed", "error");
    } finally {
      setSending(false);
    }
  }, [selected, templateKey, onSent, onClose, toast]);

  const allVisibleSelected =
    recipients.length > 0 && recipients.every((r) => selectedSet.has(r.id));

  return (
    <ClModal
      open={open}
      onClose={onClose}
      size="lg"
      title={`Send to selected — ${templateKey}`}
      description="Pick exactly who receives this template. Search, filter, tick checkboxes, then send."
      footer={
        <>
          <div className="text-[12px] text-[var(--color-text-tertiary)] mr-auto">
            {selected.length} selected
          </div>
          <ClButton variant="ghost" size="default" onClick={onClose}>
            Cancel
          </ClButton>
          <ClButton
            variant="primary"
            size="default"
            loading={sending}
            onClick={handleSend}
          >
            {sending ? "Sending…" : `Send to ${selected.length} recipient${selected.length === 1 ? "" : "s"}`}
          </ClButton>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            className={inputClass}
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search recipients"
          />
          <div className="flex gap-2 shrink-0">
            <select
              className={selectClass}
              value={role}
              onChange={(e) => setRole(e.target.value as RoleFilter)}
              aria-label="Filter by role"
            >
              <option value="ALL">All roles</option>
              <option value="PROVIDER">Only creators</option>
              <option value="CLIENT">Only brands</option>
              <option value="ADMIN">Only admins</option>
            </select>
            <select
              className={selectClass}
              value={consent}
              onChange={(e) => setConsent(e.target.value as ConsentFilter)}
              aria-label="Filter by consent"
            >
              <option value="ALL">Everyone</option>
              <option value="SUBSCRIBERS">Subscribers only</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className={quickButton(limit === 100 && role === "ALL" && consent === "ALL")} onClick={() => applyQuickFilter("first100")}>
            First 100
          </button>
          <button className={quickButton(role === "PROVIDER")} onClick={() => applyQuickFilter("creators")}>
            Only creators
          </button>
          <button className={quickButton(role === "CLIENT")} onClick={() => applyQuickFilter("brands")}>
            Only brands
          </button>
          <button className={quickButton(consent === "SUBSCRIBERS")} onClick={() => applyQuickFilter("subscribers")}>
            Only subscribers
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-[var(--color-border-mid)] px-3 py-2">
          <ClButton variant="ghost" size="sm" onClick={selectAllVisible}>
            Select all{recipients.length > 0 ? ` (${recipients.length})` : ""}
          </ClButton>
          <ClButton variant="ghost" size="sm" onClick={invertVisible}>
            Invert select
          </ClButton>
          <ClButton variant="ghost" size="sm" onClick={clearSelection}>
            Clear
          </ClButton>
          <ClButton variant="ghost" size="sm" onClick={undoSelect}>
            Undo select{undoStack.length > 0 ? ` (${undoStack.length})` : ""}
          </ClButton>
          <span className="ml-auto text-[12px] text-[var(--color-text-tertiary)]">
            Showing {recipients.length} of {total}
          </span>
        </div>

        <div className="max-h-[320px] overflow-y-auto rounded-[10px] border border-[var(--color-border)]">
          {isLoading ? (
            <div className="text-[13px] text-[var(--color-text-secondary)] text-center py-8">
              Loading recipients…
            </div>
          ) : isError ? (
            <div className="text-center py-8">
              <div className="text-[13px] text-[var(--color-text-secondary)] mb-3">
                Couldn&apos;t load recipients.
              </div>
              <ClButton variant="outlined" size="sm" onClick={() => refetch()}>
                Retry
              </ClButton>
            </div>
          ) : recipients.length === 0 ? (
            <div className="text-[13px] text-[var(--color-text-tertiary)] text-center py-8">
              No recipients match these filters.
            </div>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              <li className="flex items-center gap-3 px-3 py-2 bg-[var(--color-surface-raised)] sticky top-0">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={() => (allVisibleSelected ? clearSelection() : selectAllVisible())}
                  aria-label="Select all visible recipients"
                  className="w-4 h-4 accent-[var(--color-accent)] cursor-pointer"
                />
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
                  {allVisibleSelected ? "Deselect visible" : "Select visible"}
                </span>
              </li>
              {recipients.map((r) => (
                <li key={r.id}>
                  <label className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-[var(--color-surface-raised)]">
                    <input
                      type="checkbox"
                      checked={selectedSet.has(r.id)}
                      onChange={() => toggleOne(r.id)}
                      aria-label={`Select ${r.email}`}
                      className="w-4 h-4 accent-[var(--color-accent)] cursor-pointer shrink-0"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium text-[var(--color-text-primary)] truncate">
                        {r.name}
                      </span>
                      <span className="block text-[12px] text-[var(--color-text-tertiary)] truncate">
                        {r.email}
                      </span>
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)] shrink-0">
                      {r.role === "PROVIDER" ? "Creator" : r.role === "CLIENT" ? "Brand" : r.role}
                      {r.hasMarketingConsent ? " · Sub" : ""}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </ClModal>
  );
}
