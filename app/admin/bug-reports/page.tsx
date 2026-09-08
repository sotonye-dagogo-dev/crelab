"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClButton, ClBadge, ClTextarea, ClSelect } from "@/components/ui";
import { useToast } from "@/lib/toast";
import type { IBugReport } from "@/types";
import { Bug, Clock, AlertTriangle, Mail, Image as ImageIcon, CheckSquare, Square } from "lucide-react";

const statusColors: Record<string, "warning" | "info" | "success" | "default"> = {
  OPEN: "warning",
  IN_PROGRESS: "info",
  RESOLVED: "success",
  CLOSED: "default",
};

const statusLabels: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export default function AdminBugReportsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [notesInput, setNotesInput] = useState<Record<string, string>>({});
  const [sendEmailToggles, setSendEmailToggles] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<string>("");
  const [bulkNotes, setBulkNotes] = useState<string>("");
  const [bulkSendEmail, setBulkSendEmail] = useState<boolean>(true);


  const { data: reports = [], isLoading } = useQuery<IBugReport[]>({
    queryKey: ["admin-bug-reports"],
    queryFn: async () => {
      const res = await fetch("/api/admin/bug-reports");
      const json = await res.json();
      if (json.success) return json.data ?? [];
      throw new Error(json.error ?? "Failed to load bug reports");
    },
  });

  const filtered = useMemo(() => {
    if (statusFilter === "ALL") return reports;
    return reports.filter((r) => r.status === statusFilter);
  }, [reports, statusFilter]);

  const allFilteredIds = useMemo(() => filtered.map((r) => r.id), [filtered]);
  const allSelected = filtered.length > 0 && filtered.every((r) => selectedIds.has(r.id));

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of allFilteredIds) next.delete(id);
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of allFilteredIds) next.add(id);
        return next;
      });
    }
  }

  const patchMutation = useMutation({
    mutationFn: async (body: { id: string; status?: string; adminNotes?: string; sendEmail?: boolean }) => {
      const res = await fetch("/api/admin/bug-reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to update");
      return json as { success: boolean; email?: { sent: boolean; to?: string; skippedReason?: string } };
    },
    onSuccess: (data, vars) => {
      const emailInfo = data.email?.sent ? ` · email sent to ${data.email.to}` : data.email?.skippedReason ? ` · email skipped: ${data.email.skippedReason}` : "";
      // Differentiate message when status changed vs notes saved
      if (vars.status) toast(`Status updated to ${vars.status}${emailInfo}`, data.email?.sent ? "success" : "success");
      else toast(`Notes saved${emailInfo}`, "success");
      queryClient.invalidateQueries({ queryKey: ["admin-bug-reports"] });
    },
    onError: (err: Error) => {
      toast(err.message, "error");
    },
  });

  const bulkMutation = useMutation({
    mutationFn: async (body: { ids: string[]; status?: string; adminNotes?: string; sendEmail?: boolean }) => {
      const res = await fetch("/api/admin/bug-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Bulk update failed");
      return json as { success: boolean; data: { updated: number; emailed: number; skipped: number } };
    },
    onSuccess: (data) => {
      const { updated, emailed, skipped } = data.data;
      toast(`Bulk update: ${updated} updated · ${emailed} emails sent${skipped ? `, ${skipped} skipped` : ""}`, "success");
      setSelectedIds(new Set());
      setBulkStatus("");
      queryClient.invalidateQueries({ queryKey: ["admin-bug-reports"] });
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  if (isLoading) {
    return <div className="text-[var(--color-text-secondary)]">Loading...</div>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Bug className="w-5 h-5 text-[var(--color-primary)]" />
          <h1 className="font-[family-name:var(--font-display)] font-extrabold text-2xl">Bug Reports</h1>
          <ClBadge variant="default">{reports.length} total</ClBadge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[var(--color-text-tertiary)]">Filter:</span>
          <ClSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </ClSelect>
          {filtered.length > 0 && (
            <ClButton variant="ghost" size="sm" onClick={toggleSelectAll}>
              {allSelected ? <CheckSquare className="w-4 h-4 mr-1.5" /> : <Square className="w-4 h-4 mr-1.5" />}
              {allSelected ? "Deselect all" : "Select all"}
            </ClButton>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-primary)]/30 rounded-lg p-4 mb-6 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-semibold">{selectedIds.size} selected</span>
            <button type="button" onClick={() => setSelectedIds(new Set())} className="text-[12px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]">Clear selection</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[180px_1fr_auto] gap-3 items-end">
            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-[var(--color-text-tertiary)]">Bulk status</span>
              <ClSelect value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
                <option value="">— No change —</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress (sends “under review” email)</option>
                <option value="RESOLVED">Resolved (sends completion email)</option>
                <option value="CLOSED">Closed (sends completion email)</option>
              </ClSelect>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-[var(--color-text-tertiary)]">
                Bulk note <span className="font-normal text-[11px]">— same note applied to all selected</span>
              </span>
              <div className="flex gap-2">
                <ClTextarea
                  value={bulkNotes}
                  onChange={(e) => setBulkNotes(e.target.value)}
                  placeholder="Optional note/remarks included in the status email (leave empty to keep per-report notes)"
                  rows={2}
                  className="flex-1"
                />
              </div>

            </label>

            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-[12px] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={bulkSendEmail}
                  onChange={(e) => setBulkSendEmail(e.target.checked)}
                  className="rounded"
                />
                <Mail className="w-3.5 h-3.5" />
                Send status emails
              </label>
              <ClButton
                size="sm"
                loading={bulkMutation.isPending}
                disabled={bulkMutation.isPending || (!bulkStatus && bulkNotes.trim() === "")}
                onClick={() => {
                  const body: { ids: string[]; status?: string; adminNotes?: string; sendEmail?: boolean } = {
                    ids: Array.from(selectedIds),
                    sendEmail: bulkSendEmail,
                  };
                  if (bulkStatus) body.status = bulkStatus;
                  if (bulkNotes.trim() !== "") body.adminNotes = bulkNotes;

                  bulkMutation.mutate(body);
                }}
              >
                Apply to {selectedIds.size}
              </ClButton>
              <span className="text-[11px] text-[var(--color-text-tertiary)]">Emails include the note when present.</span>
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-[var(--color-text-secondary)]">{reports.length === 0 ? "No bug reports yet." : "No reports match the selected filter."}</p>
      ) : (
        <div className="space-y-4">
          {filtered.map((report) => {
            const screenshotUrls: string[] = (report.screenshotUrls as string[]) ?? [];
            const attachmentsFallback: string[] = Array.isArray(report.attachments)
              ? report.attachments
                  .map((a: unknown) => {
                    if (typeof a === "string") return a;
                    if (a && typeof a === "object" && "url" in (a as Record<string, unknown>)) return String((a as Record<string, unknown>).url);
                    return null;
                  })
                  .filter(Boolean) as string[]
              : [];
            const allImages = screenshotUrls.length ? screenshotUrls : attachmentsFallback;
            const isSelected = selectedIds.has(report.id);
            const effectiveNotes = notesInput[report.id] ?? (report.adminNotes ?? "");
            const sendEmail = sendEmailToggles[report.id] ?? true;
            return (
              <div
                key={report.id}
                className={`bg-[var(--color-surface)] border rounded-lg p-5 space-y-3 ${isSelected ? "border-[var(--color-primary)]/50" : "border-[var(--color-border)]"}`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggleSelect(report.id)}
                    className="mt-0.5 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
                    aria-label={isSelected ? "Deselect" : "Select"}
                  >
                    {isSelected ? <CheckSquare className="w-4 h-4 text-[var(--color-primary)]" /> : <Square className="w-4 h-4" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        {report.severity === "CRITICAL" ? (
                          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                        ) : report.severity === "HIGH" ? (
                          <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
                        ) : (
                          <Bug className="w-4 h-4 shrink-0" />
                        )}
                        <h3 className="font-semibold text-[15px] truncate">{report.title}</h3>
                        <ClBadge variant={statusColors[report.status]}>{statusLabels[report.status] ?? report.status}</ClBadge>
                        <ClBadge variant="default">{report.severity}</ClBadge>
                      </div>
                      <div className="flex items-center gap-2 text-[12px] text-[var(--color-text-tertiary)] whitespace-nowrap shrink-0">
                        <Clock className="w-3 h-3" />
                        {new Date(report.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap break-words ml-7">
                  {report.description}
                </p>

                {(report.reporterEmail || report.reporterName || report.userId) && (
                  <div className="flex flex-wrap items-center gap-3 text-[12px] ml-7">
                    {report.reporterEmail && (
                      <span className="inline-flex items-center gap-1.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-full px-2.5 py-1">
                        <Mail className="w-3 h-3" />
                        {report.reporterName ? `${report.reporterName} — ` : ""}{report.reporterEmail}
                      </span>
                    )}
                    {!report.reporterEmail && report.userId && (
                      <span className="text-[var(--color-text-tertiary)]">Linked account: {report.userId.slice(0, 8)}…</span>
                    )}
                    {!report.reporterEmail && !report.reporterName && !report.userId && (
                      <span className="text-[var(--color-text-tertiary)]">Anonymous</span>
                    )}
                  </div>
                )}

                {report.stepsToReproduce && (
                  <div className="ml-7">
                    <span className="text-[12px] font-semibold text-[var(--color-text-tertiary)]">Steps to reproduce:</span>
                    <p className="text-[13px] text-[var(--color-text-secondary)] mt-1 whitespace-pre-wrap break-words">{report.stepsToReproduce}</p>
                  </div>
                )}
                {(report.expectedBehavior || report.actualBehavior) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-7">
                    {report.expectedBehavior && (
                      <div>
                        <span className="text-[12px] font-semibold text-[var(--color-text-tertiary)]">Expected:</span>
                        <p className="text-[13px] text-[var(--color-text-secondary)] mt-1 whitespace-pre-wrap">{report.expectedBehavior}</p>
                      </div>
                    )}
                    {report.actualBehavior && (
                      <div>
                        <span className="text-[12px] font-semibold text-[var(--color-text-tertiary)]">Actual:</span>
                        <p className="text-[13px] text-[var(--color-text-secondary)] mt-1 whitespace-pre-wrap">{report.actualBehavior}</p>
                      </div>
                    )}
                  </div>
                )}

                {allImages.length > 0 && (
                  <div className="ml-7">
                    <span className="text-[12px] font-semibold text-[var(--color-text-tertiary)] flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5" /> Screenshots
                    </span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {allImages.map((url, i) => (
                        <a key={`${url}-${i}`} href={url} target="_blank" rel="noreferrer" className="block border border-[var(--color-border)] rounded-lg overflow-hidden hover:border-[var(--color-primary)]/50 transition-colors">
                          <img src={url} alt={`Screenshot ${i + 1}`} className="w-32 h-24 object-cover" loading="lazy" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-4 text-[12px] text-[var(--color-text-tertiary)] ml-7">
                  {report.pageUrl && (
                    <a href={report.pageUrl} target="_blank" rel="noreferrer" className="underline hover:text-[var(--color-text-primary)] truncate max-w-[320px]">
                      {report.pageUrl}
                    </a>
                  )}
                  {report.userAgent && (
                    <span className="truncate max-w-[260px]" title={report.userAgent}>
                      {report.userAgent}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-3 pt-3 border-t border-[var(--color-border)] ml-0 md:ml-7">
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="flex flex-col gap-1 min-w-[160px]">
                      <span className="text-[12px] font-medium text-[var(--color-text-tertiary)]">Status</span>
                      <ClSelect
                        value={report.status}
                        disabled={patchMutation.isPending}
                        onChange={(e) => {
                          const next = e.target.value;
                          const noteToSend = effectiveNotes;
                          patchMutation.mutate({
                            id: report.id,
                            status: next,
                            adminNotes: noteToSend !== (report.adminNotes ?? "") ? noteToSend : undefined,
                            sendEmail,
                          });
                        }}
                      >
                        <option value="OPEN">Open</option>
                        <option value="IN_PROGRESS">In Progress — notify “under review”</option>
                        <option value="RESOLVED">Resolved — notify “completed”</option>
                        <option value="CLOSED">Closed — notify “completed”</option>
                      </ClSelect>
                    </label>

                    <label className="flex items-center gap-2 text-[12px] cursor-pointer select-none pb-2">
                      <input
                        type="checkbox"
                        checked={sendEmail}
                        onChange={(e) => setSendEmailToggles((prev) => ({ ...prev, [report.id]: e.target.checked }))}
                        className="rounded"
                      />
                      <Mail className="w-3.5 h-3.5" />
                      Email reporter on status change
                    </label>
                  </div>

                  <label className="flex flex-col gap-1">
                    <span className="text-[12px] font-medium text-[var(--color-text-tertiary)]">
                      Admin notes / remarks <span className="font-normal">(included in the email when present)</span>
                    </span>
                    <div className="flex gap-2 items-end">
                      <ClTextarea
                        value={effectiveNotes}
                        onChange={(e) => setNotesInput((prev) => ({ ...prev, [report.id]: e.target.value }))}
                        rows={2}
                        placeholder="Optional — e.g. “Thanks, we’ve reproduced this on staging. Fix scheduled for next release.”"
                        className="flex-1"
                      />
                      <div className="flex flex-col gap-2 shrink-0">
                        <ClButton
                          variant="ghost"
                          size="sm"
                          loading={patchMutation.isPending}
                          disabled={patchMutation.isPending}
                          onClick={() => {
                            patchMutation.mutate({
                              id: report.id,
                              adminNotes: effectiveNotes,
                            });
                          }}
                        >
                          Save notes
                        </ClButton>
                      </div>
                    </div>
                  </label>
                  <p className="text-[11px] text-[var(--color-text-tertiary)]">
                    Changing the status will automatically email the reporter when the toggle is on: <strong>In Progress</strong> → “under review” email, <strong>Resolved/Closed</strong> → completion email (with your note if provided).
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
