"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClButton } from "@/components/ui";
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
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

      <div className="bg-[var(--color-surface)] rounded-[12px] overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[var(--color-surface-raised)]">
              <th className="w-[40px] px-[14px] py-[10px] text-left">
                <input
                  type="checkbox"
                  checked={selectedIds.size === categorySlugs.length && categorySlugs.length > 0}
                  onChange={() => {
                    if (selectedIds.size === categorySlugs.length) clearSelection();
                    else selectAll(categorySlugs);
                  }}
                  className="cursor-pointer accent-[var(--color-accent)]"
                />
              </th>
              <th className="px-[14px] py-[10px] text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
                Slug
              </th>
              <th className="px-[14px] py-[10px] text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
                Label
              </th>
              <th className="px-[14px] py-[10px] text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
                Field Count
              </th>
              <th className="px-[14px] py-[10px] text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
                Active
              </th>
              <th className="px-[14px] py-[10px] text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 && (
              <tr>
                <td colSpan={6} className="px-[14px] py-[10px] text-[12px] text-[var(--color-text-tertiary)] text-center">
                  No categories found.
                </td>
              </tr>
            )}
            {categories.map((cat) => (
              <tr
                key={cat.slug}
                className={`border-b border-[var(--color-border)] last:border-b-0 even:bg-[var(--color-surface-raised)] ${
                  selectedIds.has(cat.slug) ? "bg-[var(--color-accent-muted)]" : ""
                }`}
              >
                <td className="w-[40px] px-[14px] py-[10px]">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(cat.slug)}
                    onChange={() => toggleSelect(cat.slug)}
                    className="cursor-pointer accent-[var(--color-accent)]"
                  />
                </td>
                <td className="px-[14px] py-[10px] text-[12px] font-[family-name:var(--font-mono)]">
                  {cat.slug}
                </td>
                <td className="px-[14px] py-[10px] text-[12px]">{cat.label}</td>
                <td className="px-[14px] py-[10px] text-[12px]">
                  {cat.fieldSchema.length}
                </td>
                <td className="px-[14px] py-[10px]">
                  <span className={`inline-flex items-center w-9 h-5 rounded-[9999px] relative transition-colors ${cat.active ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-mid)]"}`}>
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${cat.active ? "translate-x-4" : ""}`} />
                  </span>
                </td>
                <td className="px-[14px] py-[10px]">
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
                        className="text-[12px] text-[var(--color-error)] cursor-pointer bg-transparent border-none p-0"
                      >
                        Disable
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CategoryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        category={editingCategory}
      />
    </div>
  );
}
