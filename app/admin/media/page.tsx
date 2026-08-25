"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClButton, ClBadge, ClConfirmDialog, ClDataTable, type ClColumn } from "@/components/ui";
import { useToast } from "@/lib/toast";
import { useBatchSelect, BatchToolbar } from "@/components/admin/BatchOperations";
import {
  Film,
  Image as ImageIcon,
  Trash2,
  Sparkles,
  FileWarning,
} from "lucide-react";
import type { IMediaAsset } from "@/types";

interface CleanupResult {
  enabled: boolean;
  thresholdHours: number;
  candidates: number;
  deleted: number;
  skippedBinary: number;
  errors: string[];
}

export default function AdminMediaPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedIds, toggleSelect, selectAll, invertSelect, clearSelection } =
    useBatchSelect<string>();
  const [assetToDelete, setAssetToDelete] = useState<IMediaAsset | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [runningCleanup, setRunningCleanup] = useState(false);

  const { data: assets = [], isLoading } = useQuery<IMediaAsset[]>({
    queryKey: ["admin-media"],
    queryFn: async () => {
      const res = await fetch("/api/admin/media");
      const json = await res.json();
      if (json.success) return json.data ?? [];
      throw new Error(json.error ?? "Failed to load media assets");
    },
  });

  const assetIds = assets.map((a) => a.id);

  const deleteAsset = async (id: string) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/media/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to delete asset");
      toast("Media asset deleted", "info");
      queryClient.invalidateQueries({ queryKey: ["admin-media"] });
      setAssetToDelete(null);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Delete failed", "error");
    } finally {
      setDeleting(false);
    }
  };

  const batchDelete = async (ids: string[]) => {
    for (const id of ids) {
      const res = await fetch(`/api/admin/media/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to delete asset");
    }
    queryClient.invalidateQueries({ queryKey: ["admin-media"] });
  };

  const runCleanup = async () => {
    setRunningCleanup(true);
    try {
      const res = await fetch("/api/admin/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: false }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Cleanup failed");
      const r = json.data as CleanupResult;
      if (!r.enabled) {
        toast("Orphan cleanup is disabled in platform config", "info");
      } else if (r.candidates === 0) {
        toast("No orphan assets to clean up", "info");
      } else {
        toast(
          `Cleanup: ${r.deleted} deleted, ${r.skippedBinary} skipped (binary), ${r.errors.length} errors`,
          r.errors.length ? "error" : "success",
        );
      }
      queryClient.invalidateQueries({ queryKey: ["admin-media"] });
      setCleanupOpen(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Cleanup failed", "error");
    } finally {
      setRunningCleanup(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-[var(--color-text-secondary)] text-[14px]">
        Loading media assets...
      </div>
    );
  }

  const allSelected = selectedIds.size === assetIds.length && assetIds.length > 0;

  const columns: ClColumn<IMediaAsset>[] = [
    {
      key: "checkbox",
      header: (
        <input
          type="checkbox"
          checked={allSelected}
          onChange={() => {
            if (allSelected) clearSelection();
            else selectAll(assetIds);
          }}
          className="cursor-pointer accent-[var(--color-accent)]"
          aria-label="Select all"
        />
      ),
      width: "w-[40px]",
      cell: (asset) => (
        <input
          type="checkbox"
          checked={selectedIds.has(asset.id)}
          onChange={() => toggleSelect(asset.id)}
          className="cursor-pointer accent-[var(--color-accent)]"
          aria-label={`Select ${asset.publicId}`}
        />
      ),
    },
    {
      key: "preview",
      header: "Preview",
      cell: (asset) => (
        <div className="w-14 h-14 rounded-[8px] overflow-hidden bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
          {asset.resourceType === "video" ? (
            <div className="w-full h-full flex items-center justify-center">
              <Film size={18} strokeWidth={1.5} color="var(--color-accent)" />
            </div>
          ) : asset.thumbnailUrl || asset.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={asset.thumbnailUrl ?? asset.url}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon size={18} strokeWidth={1.5} color="var(--color-text-tertiary)" />
            </div>
          )}
        </div>
      ),
    },
    {
      key: "asset",
      header: "Asset",
      cell: (asset) => (
        <div>
          <div className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-text-secondary)]">
            {asset.publicId}
          </div>
          <div className="text-[11px] text-[var(--color-text-tertiary)] max-w-[220px] truncate">
            {asset.url}
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (asset) => (
        <ClBadge variant={asset.resourceType === "video" ? "info" : "default"}>
          {asset.resourceType}
        </ClBadge>
      ),
    },
    {
      key: "owner",
      header: "Owner",
      cell: (asset) => (
        <span className="text-[12px] text-[var(--color-text-secondary)]">{asset.ownerName ?? "—"}</span>
      ),
    },
    {
      key: "uploaded",
      header: "Uploaded",
      hideOnMobile: true,
      cell: (asset) => (
        <span className="text-[12px] text-[var(--color-text-secondary)]">
          {new Date(asset.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (asset) =>
        asset.referenced ? (
          <ClBadge variant="success">In use</ClBadge>
        ) : (
          <ClBadge variant="warning">
            <FileWarning size={11} strokeWidth={2} />
            Orphan
          </ClBadge>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (asset) => (
        <button
          onClick={() => setAssetToDelete(asset)}
          disabled={deleting}
          className="inline-flex items-center gap-1 text-[12px] text-[var(--color-error)] cursor-pointer bg-transparent border-none p-0 disabled:opacity-50"
        >
          <Trash2 size={13} strokeWidth={1.8} />
          Delete
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] font-bold text-[22px] tracking-[-0.01em]">
            Media Assets
          </h2>
          <div className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">
            Cloudinary uploads tracked by the platform. Orphans are removed by
            the scheduled cleanup job; you can run it manually below.
          </div>
        </div>
        <ClButton
          variant="accent-outlined"
          size="default"
          onClick={() => setCleanupOpen(true)}
          loading={runningCleanup}
        >
          <Sparkles size={15} strokeWidth={1.8} />
          Run cleanup
        </ClButton>
      </div>

      <BatchToolbar
        ids={assetIds}
        selectedIds={selectedIds}
        onSelectAll={() => selectAll(assetIds)}
        onInvert={() => invertSelect(assetIds)}
        onClear={clearSelection}
        actions={[
          {
            label: "Delete",
            variant: "outlined",
            confirmTitle: "Delete media assets",
            confirmMessage:
              "Delete the selected media assets? The files are permanently removed from Cloudinary and any profile or portfolio references are cleared. This cannot be undone.",
            danger: true,
            execute: batchDelete,
          },
        ]}
      />

      <ClDataTable
        columns={columns}
        rows={assets}
        rowKey={(a) => a.id}
        pageSize={10}
        emptyState={
          <div className="text-[12px] text-[var(--color-text-tertiary)] text-center py-8">
            No media assets tracked yet. Uploads will appear here.
          </div>
        }
      />

      <ClConfirmDialog
        open={assetToDelete !== null}
        title="Delete media asset"
        message={`Permanently remove "${assetToDelete?.publicId}" from Cloudinary and clear it from any profile or portfolio that references it. This cannot be undone.`}
        confirmLabel="Delete asset"
        loading={deleting}
        onConfirm={() => assetToDelete && deleteAsset(assetToDelete.id)}
        onCancel={() => setAssetToDelete(null)}
      />

      <ClConfirmDialog
        open={cleanupOpen}
        title="Run orphan cleanup"
        message="Scan for uploads older than the configured threshold that are not used by any profile or portfolio, and delete them from Cloudinary to free storage. This cannot be undone."
        confirmLabel="Run cleanup"
        loading={runningCleanup}
        onConfirm={runCleanup}
        onCancel={() => setCleanupOpen(false)}
      />
    </div>
  );
}
