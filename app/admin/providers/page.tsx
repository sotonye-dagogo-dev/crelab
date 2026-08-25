"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClButton, ClDataTable, type ClColumn } from "@/components/ui";
import { useToast } from "@/lib/toast";
import { useBatchSelect, BatchToolbar } from "@/components/admin/BatchOperations";
import { Check, AlertTriangle } from "lucide-react";

interface ProviderReviewItem {
  id: string;
  displayName: string;
  categorySlug: string;
  createdAt: string;
  portfolioCount: number;
}

export default function ProvidersPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedIds, toggleSelect, selectAll, invertSelect, clearSelection } = useBatchSelect<string>();

  const { data: providers = [], isLoading } = useQuery<ProviderReviewItem[]>({
    queryKey: ["admin-providers-pending"],
    queryFn: async () => {
      const res = await fetch("/api/admin/providers");
      const json = await res.json();
      if (json.success) return json.data ?? [];
      throw new Error(json.error ?? "Failed to load providers");
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/providers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified: true, adminNotes: "Approved by admin" }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to approve");
    },
    onSuccess: () => {
      toast("Provider approved", "success");
      queryClient.invalidateQueries({ queryKey: ["admin-providers-pending"] });
    },
    onError: (err: Error) => {
      toast(err.message, "error");
    },
  });

  const flagMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/providers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: false, adminNotes: "Flagged for review by admin" }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to flag");
    },
    onSuccess: () => {
      toast("Provider flagged", "info");
      queryClient.invalidateQueries({ queryKey: ["admin-providers-pending"] });
    },
    onError: (err: Error) => {
      toast(err.message, "error");
    },
  });

  const batchMutation = useMutation({
    mutationFn: async (body: { action: string; ids: string[] }) => {
      const res = await fetch("/api/admin/providers/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Batch action failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-providers-pending"] });
    },
  });

  if (isLoading) {
    return (
      <div className="text-[var(--color-text-secondary)] text-[14px]">
        Loading providers...
      </div>
    );
  }

  const providerIds = providers.map((p) => p.id);
  const allSelected = selectedIds.size === providerIds.length && providerIds.length > 0;

  const columns: ClColumn<ProviderReviewItem>[] = [
    {
      key: "checkbox",
      header: (
        <input
          type="checkbox"
          checked={allSelected}
          onChange={() => {
            if (allSelected) clearSelection();
            else selectAll(providerIds);
          }}
          className="cursor-pointer accent-[var(--color-accent)]"
          aria-label="Select all"
        />
      ),
      width: "w-[40px]",
      cell: (provider) => (
        <input
          type="checkbox"
          checked={selectedIds.has(provider.id)}
          onChange={() => toggleSelect(provider.id)}
          className="cursor-pointer accent-[var(--color-accent)]"
          aria-label={`Select ${provider.displayName}`}
        />
      ),
    },
    {
      key: "name",
      header: "Name",
      cell: (provider) => <span className="text-[12px]">{provider.displayName}</span>,
    },
    {
      key: "category",
      header: "Category",
      cell: (provider) => <span className="text-[12px]">{provider.categorySlug}</span>,
    },
    {
      key: "submitted",
      header: "Submitted",
      hideOnMobile: true,
      cell: (provider) => (
        <span className="text-[11px] font-[family-name:var(--font-mono)] text-[var(--color-text-tertiary)]">
          {new Date(provider.createdAt).toLocaleDateString("en-CA")}
        </span>
      ),
    },
    {
      key: "portfolio",
      header: "Portfolio Items",
      hideOnMobile: true,
      cell: (provider) => <span className="text-[12px]">{provider.portfolioCount}</span>,
    },
    {
      key: "actions",
      header: "Actions",
      cell: (provider) => (
        <div className="flex items-center gap-2">
          <ClButton
            variant="outlined"
            size="sm"
            onClick={() => approveMutation.mutate(provider.id)}
            loading={approveMutation.isPending}
            className="!text-[var(--color-success)] !border-[var(--color-success)] hover:!bg-[rgba(74,222,128,0.08)]"
          >
            <Check size={14} strokeWidth={2.5} />
            Approve
          </ClButton>
          <ClButton
            variant="outlined"
            size="sm"
            onClick={() => flagMutation.mutate(provider.id)}
            loading={flagMutation.isPending}
            className="!text-[var(--color-warning)] !border-[var(--color-warning)] hover:!bg-[rgba(250,204,21,0.08)]"
          >
            <AlertTriangle size={14} strokeWidth={2.5} />
            Flag
          </ClButton>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
        <div>
          <h2 className="font-[family-name:var(--font-display)] font-bold text-[22px] tracking-[-0.01em]">
            New Providers — Pending Review ({providers.length})
          </h2>
          <div className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">
            Providers with active=true and verified=false. Approve or flag after reviewing their portfolio.
          </div>
        </div>
      </div>

      <BatchToolbar
        ids={providerIds}
        selectedIds={selectedIds}
        onSelectAll={() => selectAll(providerIds)}
        onInvert={() => invertSelect(providerIds)}
        onClear={clearSelection}
        actions={[
          {
            label: "Approve All",
            variant: "outlined",
            confirmTitle: "Approve Selected",
            confirmMessage: "Are you sure you want to approve all selected providers? They will be marked as verified.",
            execute: async (ids) => { await batchMutation.mutateAsync({ action: "approve", ids }); },
            undo: async (ids) => {
              await batchMutation.mutateAsync({ action: "flag", ids });
              toast("Approval undone — providers re-flagged", "info");
            },
          },
          {
            label: "Flag All",
            variant: "outlined",
            confirmTitle: "Flag Selected",
            confirmMessage: "Flag the selected providers for review (sets active=false).",
            execute: async (ids) => { await batchMutation.mutateAsync({ action: "flag", ids }); },
          },
        ]}
      />

      <ClDataTable
        columns={columns}
        rows={providers}
        rowKey={(p) => p.id}
        pageSize={10}
        emptyState={
          <div className="text-[12px] text-[var(--color-text-tertiary)] text-center py-8">
            No providers pending review.
          </div>
        }
      />
    </div>
  );
}
