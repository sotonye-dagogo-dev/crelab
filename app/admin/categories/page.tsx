"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClButton, ClDataTable, type ClColumn } from "@/components/ui";
import { CategoryModal } from "@/components/admin/CategoryModal";
import { useToast } from "@/lib/toast";
import { useBatchSelect, BatchToolbar } from "@/components/admin/BatchOperations";
import type { ICategoryConfig } from "@/types";

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ICategoryConfig | null>(null);
  const { selectedIds, toggleSelect, selectAll, invertSelect, clearSelection } = useBatchSelect<string>();

  const { data: categories = [], isLoading } = useQuery<ICategoryConfig[]>({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const res = await fetch("/api/admin/categories");
      const json = await res.json();
      if (json.success) return json.data ?? [];
      throw new Error(json.error ?? "Failed to load categories");
    },
  });

  const disableMutation = useMutation({
    mutationFn: async (slug: string) => {
      const res = await fetch(`/api/admin/categories/${slug}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to disable category");
    },
    onSuccess: () => {
      toast("Category disabled", "success");
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    },
    onError: (err: Error) => {
      toast(err.message, "error");
    },
  });

  const batchMutation = useMutation({
    mutationFn: async (body: { action: string; ids: string[] }) => {
      const res = await fetch("/api/admin/categories/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Batch action failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    },
  });

  const handleAdd = () => {
    setEditingCategory(null);
    setModalOpen(true);
  };

  const handleEdit = (cat: ICategoryConfig) => {
    setEditingCategory(cat);
    setModalOpen(true);
  };

  const handleSave = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
  };

  if (isLoading) {
    return (
      <div className="text-[var(--color-text-secondary)] text-[14px]">
        Loading categories...
      </div>
    );
  }

  const categorySlugs = categories.map((c) => c.slug);
  const allSelected = selectedIds.size === categorySlugs.length && categorySlugs.length > 0;

  const columns: ClColumn<ICategoryConfig>[] = [
    {
      key: "checkbox",
      header: (
        <input
          type="checkbox"
          checked={allSelected}
          onChange={() => {
            if (allSelected) clearSelection();
            else selectAll(categorySlugs);
          }}
          className="cursor-pointer accent-[var(--color-accent)]"
          aria-label="Select all"
        />
      ),
      width: "w-[40px]",
      cell: (cat) => (
        <input
          type="checkbox"
          checked={selectedIds.has(cat.slug)}
          onChange={() => toggleSelect(cat.slug)}
          className="cursor-pointer accent-[var(--color-accent)]"
          aria-label={`Select ${cat.label}`}
        />
      ),
    },
    {
      key: "slug",
      header: "Slug",
      cell: (cat) => <span className="text-[12px] font-[family-name:var(--font-mono)]">{cat.slug}</span>,
    },
    {
      key: "label",
      header: "Label",
      cell: (cat) => <span className="text-[12px]">{cat.label}</span>,
    },
    {
      key: "fields",
      header: "Field Count",
      hideOnMobile: true,
      cell: (cat) => <span className="text-[12px]">{cat.fieldSchema.length}</span>,
    },
    {
      key: "active",
      header: "Active",
      cell: (cat) => (
        <span className={`inline-flex items-center w-9 h-5 rounded-[9999px] relative transition-colors ${cat.active ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-mid)]"}`}>
          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${cat.active ? "translate-x-4" : ""}`} />
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (cat) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEdit(cat)}
            className="text-[12px] text-[var(--color-accent)] cursor-pointer bg-transparent border-none p-0"
          >
            Edit
          </button>
          {cat.active && (
            <button
              onClick={() => disableMutation.mutate(cat.slug)}
              disabled={disableMutation.isPending}
              className="text-[12px] text-[var(--color-error)] cursor-pointer bg-transparent border-none p-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {disableMutation.isPending ? "Disabling…" : "Disable"}
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] font-bold text-[22px] tracking-[-0.01em]">
            Categories
          </h2>
          <div className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">
            Manage service categories. Each category has a slug, label, and custom field schema.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ClButton variant="accent-outlined" size="default" onClick={handleAdd}>
            + Add Category
          </ClButton>
        </div>
      </div>

      <BatchToolbar
        ids={categorySlugs}
        selectedIds={selectedIds}
        onToggle={toggleSelect}
        onSelectAll={() => selectAll(categorySlugs)}
        onInvert={() => invertSelect(categorySlugs)}
        onClear={clearSelection}
        actions={[
          {
            label: "Disable",
            variant: "outlined",
            confirmTitle: "Disable Categories",
            confirmMessage: "Are you sure you want to disable the selected categories? They will no longer appear on the public site.",
            execute: async (ids) => { await batchMutation.mutateAsync({ action: "disable", ids }); },
          },
          {
            label: "Enable",
            variant: "outlined",
            confirmTitle: "Enable Categories",
            confirmMessage: "Enable the selected categories.",
            execute: async (ids) => { await batchMutation.mutateAsync({ action: "enable", ids }); },
          },
        ]}
      />

      <ClDataTable
        columns={columns}
        rows={categories}
        rowKey={(c) => c.slug}
        pageSize={10}
        emptyState={
          <div className="text-[12px] text-[var(--color-text-tertiary)] text-center py-8">
            No categories found.
          </div>
        }
      />

      <CategoryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        category={editingCategory}
      />
    </div>
  );
}
