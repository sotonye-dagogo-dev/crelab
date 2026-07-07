"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClButton, ClBadge, ClTextarea, ClSelect } from "@/components/ui";
import { useToast } from "@/lib/toast";
import type { IBugReport } from "@/types";
import { Bug, CheckCircle, Clock, AlertTriangle } from "lucide-react";

const statusColors: Record<string, "warning" | "info" | "success" | "default"> = {
  OPEN: "warning",
  IN_PROGRESS: "info",
  RESOLVED: "success",
  CLOSED: "default",
};

export default function AdminBugReportsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [notesInput, setNotesInput] = useState<Record<string, string>>({});

  const { data: reports = [], isLoading } = useQuery<IBugReport[]>({
    queryKey: ["admin-bug-reports"],
    queryFn: async () => {
      const res = await fetch("/api/admin/bug-reports");
      const json = await res.json();
      if (json.success) return json.data ?? [];
      throw new Error(json.error ?? "Failed to load bug reports");
    },
  });

  const patchMutation = useMutation({
    mutationFn: async (body: { id: string; status?: string; adminNotes?: string }) => {
      const res = await fetch("/api/admin/bug-reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to update");
    },
    onSuccess: () => {
      toast("Bug report updated", "success");
      queryClient.invalidateQueries({ queryKey: ["admin-bug-reports"] });
    },
    onError: (err: Error) => {
      toast(err.message, "error");
    },
  });

  if (isLoading) {
    return <div className="text-[var(--color-text-secondary)]">Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Bug className="w-5 h-5 text-[var(--color-primary)]" />
        <h1 className="font-[family-name:var(--font-display)] font-extrabold text-2xl">Bug Reports</h1>
      </div>

      {reports.length === 0 ? (
        <p className="text-[var(--color-text-secondary)]">No bug reports yet.</p>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  {report.severity === "CRITICAL" ? (
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  ) : report.severity === "HIGH" ? (
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                  ) : (
                    <Bug className="w-4 h-4" />
                  )}
                  <h3 className="font-semibold text-[15px]">{report.title}</h3>
                  <ClBadge variant={statusColors[report.status]}>{report.status}</ClBadge>
                </div>
                <div className="flex items-center gap-2 text-[12px] text-[var(--color-text-tertiary)] whitespace-nowrap">
                  <Clock className="w-3 h-3" />
                  {new Date(report.createdAt).toLocaleDateString()}
                </div>
              </div>

              <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
                {report.description}
              </p>

              {report.stepsToReproduce && (
                <div>
                  <span className="text-[12px] font-semibold text-[var(--color-text-tertiary)]">
                    Steps to reproduce:
                  </span>
                  <p className="text-[13px] text-[var(--color-text-secondary)] mt-1">
                    {report.stepsToReproduce}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-4 text-[12px] text-[var(--color-text-tertiary)]">
                {report.pageUrl && <span>Page: {report.pageUrl}</span>}
                {report.userAgent && (
                  <span className="truncate max-w-[200px]" title={report.userAgent}>
                    UA: {report.userAgent}
                  </span>
                )}
              </div>

              <div className="flex items-end gap-3 pt-2 border-t border-[var(--color-border)]">
                <label className="flex flex-col gap-1">
                  <span className="text-[12px] font-medium text-[var(--color-text-tertiary)]">Status</span>
                  <ClSelect
                    defaultValue={report.status}
                    onChange={(e) => patchMutation.mutate({ id: report.id, status: e.target.value })}
                  >
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                  </ClSelect>
                </label>

                <label className="flex flex-col gap-1 flex-1">
                  <span className="text-[12px] font-medium text-[var(--color-text-tertiary)]">Admin Notes</span>
                  <ClTextarea
                    value={notesInput[report.id] ?? report.adminNotes ?? ""}
                    onChange={(e) => setNotesInput((prev) => ({ ...prev, [report.id]: e.target.value }))}
                    rows={2}
                    className="flex-1"
                  />
                </label>

                <ClButton
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    patchMutation.mutate({
                      id: report.id,
                      adminNotes: notesInput[report.id] ?? report.adminNotes ?? "",
                    });
                  }}
                >
                  Save
                </ClButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
