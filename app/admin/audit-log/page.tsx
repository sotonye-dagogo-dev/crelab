"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClButton, ClCard, ClDataTable, ClPagination, type ClColumn } from "@/components/ui";
import { AuditValueCell } from "@/components/admin/AuditValueCell";
import { Search, RotateCcw } from "lucide-react";

interface AuditRow {
  id: string;
  userId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  oldValue: unknown;
  newValue: unknown;
  createdAt: string;
}

interface AuditPage {
  data: AuditRow[];
  total: number;
  page: number;
  pageSize: number;
}

const PAGE_SIZE = 25;

function formatAction(action: string): { label: string; tone: "accent" | "danger" | "muted" } {
  if (action.includes("delete") || action.includes("flag")) return { label: action, tone: "danger" };
  if (action.includes("update") || action.includes("create") || action.includes("resolve")) {
    return { label: action, tone: "accent" };
  }
  return { label: action, tone: "muted" };
}

export default function AdminAuditLogPage() {
  const [page, setPage] = useState(1);
  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [appliedEntity, setAppliedEntity] = useState("");
  const [appliedAction, setAppliedAction] = useState("");

  useEffect(() => {
    setPage(1);
  }, [appliedEntity, appliedAction]);

  const query = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (appliedEntity) query.set("entity", appliedEntity);
  if (appliedAction) query.set("action", appliedAction);

  const { data, isLoading, isError, refetch, isFetching } = useQuery<AuditPage>({
    queryKey: ["admin-audit-log", page, appliedEntity, appliedAction],
    queryFn: async () => {
      const res = await fetch(`/api/admin/audit-log?${query.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load audit trail");
      return json;
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  const applyFilters = () => {
    setAppliedEntity(entityFilter.trim());
    setAppliedAction(actionFilter.trim());
  };

  const resetFilters = () => {
    setEntityFilter("");
    setActionFilter("");
    setAppliedEntity("");
    setAppliedAction("");
    setPage(1);
  };

  const columns: ClColumn<AuditRow>[] = [
    {
      key: "action",
      header: "Action",
      cell: (row) => {
        const a = formatAction(row.action);
        const toneClass =
          a.tone === "danger"
            ? "text-[var(--color-error)]"
            : a.tone === "accent"
              ? "text-[var(--color-accent)]"
              : "text-[var(--color-text-secondary)]";
        return <span className={`text-[11px] font-[family-name:var(--font-mono)] ${toneClass} break-all`}>{a.label}</span>;
      },
    },
    {
      key: "entity",
      header: "Entity",
      cell: (row) => (
        <div className="min-w-0">
          <div className="text-[12px] font-[family-name:var(--font-mono)] break-all">
            {row.entity ?? "—"}
          </div>
          {row.entityId && (
            <div className="text-[10px] text-[var(--color-text-tertiary)] truncate" title={row.entityId}>
              {row.entityId}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "old",
      header: "Old Value",
      cell: (row) => <AuditValueCell value={row.oldValue} />,
    },
    {
      key: "new",
      header: "New Value",
      cell: (row) => <AuditValueCell value={row.newValue} />,
    },
    {
      key: "performedBy",
      header: "Performed By",
      cell: (row) => {
        if (!row.actorName && !row.actorEmail) {
          return <span className="text-[11px] text-[var(--color-text-tertiary)]">System / unknown</span>;
        }
        return (
          <div className="min-w-0">
            <div className="text-[12px] truncate">{row.actorName ?? "—"}</div>
            {row.actorEmail && (
              <div className="text-[11px] text-[var(--color-text-tertiary)] truncate">{row.actorEmail}</div>
            )}
          </div>
        );
      },
    },
    {
      key: "timestamp",
      header: "Timestamp",
      hideOnMobile: true,
      cell: (row) => (
        <span className="text-[11px] font-[family-name:var(--font-mono)] text-[var(--color-text-tertiary)] whitespace-nowrap">
          {new Date(row.createdAt).toLocaleString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] font-bold text-[22px] tracking-[-0.01em]">
            Audit Trail
          </h2>
          <div className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">
            Every administrative action across the platform — who did what, when, and what changed.
          </div>
        </div>
        <ClButton variant="ghost" size="default" onClick={() => refetch()} loading={isFetching}>
          <RotateCcw size={14} strokeWidth={2} className="mr-1.5" />
          Refresh
        </ClButton>
      </div>

      <ClCard className="mb-4 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 min-w-0">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)] mb-1">
              Entity
            </label>
            <input
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyFilters();
              }}
              placeholder="e.g. emailConfig.templates, providers, blogPosts"
              className="w-full h-9 rounded-[8px] border border-[var(--color-border-mid)] bg-[var(--color-surface-raised)] px-3 text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none focus:border-[var(--color-accent)]"
            />
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)] mb-1">
              Action
            </label>
            <input
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyFilters();
              }}
              placeholder="e.g. config.update, team.create, blogPost.delete"
              className="w-full h-9 rounded-[8px] border border-[var(--color-border-mid)] bg-[var(--color-surface-raised)] px-3 text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none focus:border-[var(--color-accent)]"
            />
          </div>
          <div className="flex items-end gap-2">
            <ClButton variant="primary" size="default" onClick={applyFilters}>
              <Search size={14} strokeWidth={2} className="mr-1.5" />
              Apply
            </ClButton>
            <ClButton variant="ghost" size="default" onClick={resetFilters}>
              Reset
            </ClButton>
          </div>
        </div>
      </ClCard>

      {isError ? (
        <div className="text-[13px] text-[var(--color-error)]">Failed to load the audit trail.</div>
      ) : isLoading ? (
        <div className="text-[var(--color-text-secondary)] text-[14px]">Loading audit trail...</div>
      ) : (
        <>
          <ClDataTable
            columns={columns}
            rows={data?.data ?? []}
            rowKey={(r) => r.id}
            emptyState={
              <div className="text-[12px] text-[var(--color-text-tertiary)] text-center py-8">
                No audit entries match your filters.
              </div>
            }
          />
          <ClPagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            pageSize={data?.pageSize ?? PAGE_SIZE}
            totalItems={data?.total ?? 0}
            className="mt-3"
          />
        </>
      )}
    </div>
  );
}