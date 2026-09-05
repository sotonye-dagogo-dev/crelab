"use client";

import { useState, useMemo } from "react";
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
  Eye,
  Link2,
  Clock3,
  CheckCircle,
  Upload,
  Wrench,
  Search,
} from "lucide-react";
import { MediaUpload } from "@/components/profile/MediaUpload";
import type { IMediaAsset } from "@/types";

interface CleanupResult {
  enabled: boolean;
  thresholdHours: number;
  candidates: number;
  deleted: number;
  skippedBinary: number;
  errors: string[];
}

interface MediaStatus {
  cleanupOrphanAfterHours: number;
  cleanupEnabled: boolean;
}

type StatusFilter = "all" | "inuse" | "grace" | "orphan";

function isEligibleOrphan(asset: IMediaAsset, thresholdHours: number): boolean {
  if (asset.referenced) return false;
  const ageMs = Date.now() - new Date(asset.createdAt).getTime();
  const thresholdMs = thresholdHours * 60 * 60 * 1000;
  return ageMs >= thresholdMs;
}

function graceRemaining(asset: IMediaAsset, thresholdHours: number): string {
  const ageMs = Date.now() - new Date(asset.createdAt).getTime();
  const thresholdMs = thresholdHours * 60 * 60 * 1000;
  const remaining = thresholdMs - ageMs;
  if (remaining <= 0) return "eligible";
  const hrs = Math.ceil(remaining / (60 * 60 * 1000));
  if (hrs < 24) return `${hrs}h remaining`;
  const days = Math.ceil(hrs / 24);
  return `${days}d remaining`;
}

export default function AdminMediaPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedIds, toggleSelect, selectAll, invertSelect, clearSelection } =
    useBatchSelect<string>();
  const [assetToDelete, setAssetToDelete] = useState<IMediaAsset | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [dryRunOpen, setDryRunOpen] = useState(false);
  const [runningCleanup, setRunningCleanup] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<CleanupResult | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadUrl, setUploadUrl] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "video" | "image">("all");

  // Reconcile state
  const [reconcileAsset, setReconcileAsset] = useState<IMediaAsset | null>(null);
  const [providerQuery, setProviderQuery] = useState("");
  const [providerId, setProviderId] = useState("");
  const [providerName, setProviderName] = useState("");
  const [reconcileTarget, setReconcileTarget] = useState<"portfolio" | "avatar" | "cover">("portfolio");
  const [reconciling, setReconciling] = useState(false);

  const { data: assets = [], isLoading } = useQuery<IMediaAsset[]>({
    queryKey: ["admin-media"],
    queryFn: async () => {
      const res = await fetch("/api/admin/media");
      const json = await res.json();
      if (json.success) return json.data ?? [];
      throw new Error(json.error ?? "Failed to load media assets");
    },
  });

  const { data: mediaStatus } = useQuery<MediaStatus>({
    queryKey: ["media-status-admin"],
    queryFn: async () => {
      const res = await fetch("/api/media/status");
      const json = await res.json();
      if (json.success) return json.data;
      return { cleanupOrphanAfterHours: 24, cleanupEnabled: true };
    },
  });

  const thresholdHours = mediaStatus?.cleanupOrphanAfterHours ?? 24;

  const { data: providerOptions = [] } = useQuery<{ id: string; displayName: string; categorySlug: string }[]>({
    queryKey: ["admin-providers-search", providerQuery],
    queryFn: async () => {
      const params = new URLSearchParams({ all: "true" });
      if (providerQuery.trim()) params.set("q", providerQuery.trim());
      const res = await fetch(`/api/admin/providers?${params.toString()}`);
      const json = await res.json();
      if (json.success) return json.data ?? [];
      return [];
    },
    enabled: !!reconcileAsset,
  });



  const filtered = useMemo(() => {
    return assets.filter((a) => {
      if (typeFilter !== "all" && a.resourceType !== typeFilter) return false;
      if (statusFilter === "inuse" && !a.referenced) return false;
      if (statusFilter === "orphan" && (a.referenced || !isEligibleOrphan(a, thresholdHours))) return false;
      if (statusFilter === "grace" && (a.referenced || isEligibleOrphan(a, thresholdHours))) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = `${a.publicId} ${a.url} ${a.ownerName ?? ""} ${a.mimeType ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [assets, typeFilter, statusFilter, search, thresholdHours]);

  const counts = useMemo(() => {
    const total = assets.length;
    const inuse = assets.filter((a) => a.referenced).length;
    const eligible = assets.filter((a) => !a.referenced && isEligibleOrphan(a, thresholdHours)).length;
    const grace = assets.filter((a) => !a.referenced && !isEligibleOrphan(a, thresholdHours)).length;
    return { total, inuse, eligible, grace };
  }, [assets, thresholdHours]);

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

  const runCleanup = async (dryRun: boolean) => {
    setRunningCleanup(true);
    try {
      const res = await fetch("/api/admin/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Cleanup failed");
      const r = json.data as CleanupResult;
      if (dryRun) {
        setDryRunResult(r);
        setDryRunOpen(true);
        toast(`Dry run: ${r.candidates} asset(s) would be deleted`, "info");
      } else {
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
        setDryRunOpen(false);
        setDryRunResult(null);
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Cleanup failed", "error");
    } finally {
      setRunningCleanup(false);
    }
  };

  const handleReconcile = async () => {
    if (!reconcileAsset || !providerId) {
      toast("Select a provider", "error");
      return;
    }
    setReconciling(true);
    try {
      const res = await fetch("/api/admin/media/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: reconcileAsset.id, providerId, target: reconcileTarget }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Reconcile failed");
      toast(`Asset linked as ${reconcileTarget} to ${providerName || providerId}`, "success");
      queryClient.invalidateQueries({ queryKey: ["admin-media"] });
      setReconcileAsset(null);
      setProviderId("");
      setProviderName("");
      setProviderQuery("");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Reconcile failed", "error");
    } finally {
      setReconciling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-[var(--color-text-secondary)] text-[14px]">
        Loading media assets...
      </div>
    );
  }

  const allSelected = selectedIds.size === filtered.length && filtered.length > 0;

  const columns: ClColumn<IMediaAsset>[] = [
    {
      key: "checkbox",
      header: (
        <input
          type="checkbox"
          checked={allSelected}
          onChange={() => {
            const ids = filtered.map((a) => a.id);
            if (allSelected) clearSelection();
            else selectAll(ids);
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
          {asset.thumbnailUrl || (asset.resourceType === "image" && asset.url) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={asset.thumbnailUrl ?? asset.url}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : asset.resourceType === "video" ? (
            <div className="w-full h-full flex items-center justify-center">
              <Film size={18} strokeWidth={1.5} color="var(--color-accent)" />
            </div>
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
          {asset.mimeType && <div className="text-[10px] text-[var(--color-text-tertiary)]">{asset.mimeType}</div>}
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
      cell: (asset) => {
        if (asset.referenced) {
          return <ClBadge variant="success"><CheckCircle size={11} /> In use</ClBadge>;
        }
        const eligible = isEligibleOrphan(asset, thresholdHours);
        return eligible ? (
          <ClBadge variant="warning"><FileWarning size={11} strokeWidth={2} /> Orphan</ClBadge>
        ) : (
          <ClBadge variant="default"><Clock3 size={11} /> Unlinked · {graceRemaining(asset, thresholdHours)}</ClBadge>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      cell: (asset) => (
        <div className="flex items-center gap-2">
          <a href={asset.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] text-[var(--color-accent)] no-underline">
            <Eye size={13} strokeWidth={1.8} /> View
          </a>
          {!asset.referenced && (
            <button
              onClick={() => {
                setReconcileAsset(asset);
                setProviderId("");
                setProviderName("");
                setProviderQuery("");
              }}
              className="inline-flex items-center gap-1 text-[12px] text-[var(--color-accent)] cursor-pointer bg-transparent border-none p-0"
            >
              <Wrench size={13} strokeWidth={1.8} /> Reconcile
            </button>
          )}
          <button
            onClick={() => setAssetToDelete(asset)}
            disabled={deleting}
            className="inline-flex items-center gap-1 text-[12px] text-[var(--color-error)] cursor-pointer bg-transparent border-none p-0 disabled:opacity-50"
          >
            <Trash2 size={13} strokeWidth={1.8} />
            Delete
          </button>
        </div>
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
            Cloudinary uploads tracked by the platform. Unlinked uploads enter a {thresholdHours}h grace period before they become eligible for orphan cleanup.
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            <ClBadge variant="default">{counts.total} total</ClBadge>
            <ClBadge variant="success">{counts.inuse} in use</ClBadge>
            <ClBadge variant="default">{counts.grace} unlinked (grace)</ClBadge>
            <ClBadge variant="warning">{counts.eligible} orphan eligible</ClBadge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ClButton variant="outlined" size="default" onClick={() => runCleanup(true)} loading={runningCleanup}>
            <Eye size={15} strokeWidth={1.8} />
            Dry run
          </ClButton>
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
      </div>

      {/* Admin upload */}
      <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 mb-6">
        <button
          onClick={() => setShowUpload((v) => !v)}
          className="w-full flex items-center justify-between text-left cursor-pointer bg-transparent border-none p-0"
        >
          <span className="inline-flex items-center gap-2 font-semibold text-[14px] text-[var(--color-text-primary)]">
            <Upload size={16} strokeWidth={1.8} color="var(--color-accent)" /> Upload media (admin)
          </span>
          <span className="text-[12px] text-[var(--color-accent)]">{showUpload ? "Hide" : "Show"}</span>
        </button>
        {showUpload && (
          <div className="mt-4">
            <MediaUpload
              label="Upload a file"
              accept="both"
              hint="Admin uploads are recorded with your user ID. If they appear as Unlinked, use Reconcile to attach them to a provider (portfolio, avatar, or cover) or to a blog post — until then they remain in the grace period and won't be deleted."
              value={uploadUrl}
              onChange={(url) => {
                setUploadUrl(url);
                if (url) {
                  toast("Media uploaded — now showing in the table. Reconcile it to a provider if needed.", "success");
                  queryClient.invalidateQueries({ queryKey: ["admin-media"] });
                  setUploadUrl("");
                }
              }}
            />
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search publicId, URL, owner, mime..."
            className="w-full h-9 pl-9 pr-3 rounded-[8px] bg-[var(--color-surface)] border border-[var(--color-border)] text-[13px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
          />
        </div>
        <div className="flex gap-2">
          <div className="inline-flex rounded-[8px] border border-[var(--color-border)] overflow-hidden">
            {(["all", "inuse", "grace", "orphan"] as StatusFilter[]).map((v) => (
              <button
                key={v}
                onClick={() => setStatusFilter(v)}
                className={`px-3 h-9 text-[12px] font-medium cursor-pointer border-none ${statusFilter === v ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)]" : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"}`}
              >
                {v === "all" ? "All" : v === "inuse" ? "In use" : v === "grace" ? "Unlinked" : "Orphan"}
              </button>
            ))}
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
            className="h-9 rounded-[8px] bg-[var(--color-surface)] border border-[var(--color-border)] px-3 text-[13px] text-[var(--color-text-secondary)]"
          >
            <option value="all">All types</option>
            <option value="video">Video</option>
            <option value="image">Image</option>
          </select>
        </div>
      </div>

      <BatchToolbar
        ids={filtered.map((a) => a.id)}
        selectedIds={selectedIds}
        onSelectAll={() => selectAll(filtered.map((a) => a.id))}
        onInvert={() => invertSelect(filtered.map((a) => a.id))}
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
        rows={filtered}
        rowKey={(a) => a.id}
        pageSize={10}
        emptyState={
          <div className="text-[12px] text-[var(--color-text-tertiary)] text-center py-8">
            No media assets match the current filters.
          </div>
        }
      />

      <div className="mt-3 flex items-center gap-2 text-[11px] text-[var(--color-text-tertiary)]">
        <Link2 size={12} /> Showing {filtered.length} of {assets.length} assets · Grace threshold: {thresholdHours}h
      </div>

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
        message={`Scan for unlinked uploads older than ${thresholdHours}h that are not used by any profile, portfolio, or CMS content, and delete them from Cloudinary to free storage. This cannot be undone. Use Dry run to preview first.`}
        confirmLabel="Run cleanup"
        loading={runningCleanup}
        onConfirm={() => runCleanup(false)}
        onCancel={() => setCleanupOpen(false)}
      />

      {dryRunOpen && dryRunResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[12px] p-5 max-w-[480px] w-full">
            <h3 className="font-bold text-[16px] text-[var(--color-text-primary)]">Dry run result</h3>
            <p className="text-[13px] text-[var(--color-text-secondary)] mt-1">
              {dryRunResult.enabled ? `${dryRunResult.candidates} asset(s) would be deleted (older than ${dryRunResult.thresholdHours}h). Binary deletions skipped when admin credentials are absent.` : "Cleanup is disabled."}
            </p>
            {dryRunResult.errors.length > 0 && <p className="text-[12px] text-[var(--color-error)] mt-2">{dryRunResult.errors.join("; ")}</p>}
            <div className="flex justify-end gap-2 mt-4">
              <ClButton variant="ghost" onClick={() => setDryRunOpen(false)}>Close</ClButton>
              <ClButton variant="accent-outlined" loading={runningCleanup} onClick={() => runCleanup(false)}>Run for real</ClButton>
            </div>
          </div>
        </div>
      )}

      {/* Reconcile dialog */}
      {reconcileAsset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[12px] p-5 max-w-[480px] w-full">
            <h3 className="font-bold text-[16px] text-[var(--color-text-primary)] flex items-center gap-2">
              <Wrench size={16} /> Reconcile orphan
            </h3>
            <p className="text-[12px] text-[var(--color-text-secondary)] mt-1">
              Attach <span className="font-mono text-[var(--color-text-primary)]">{reconcileAsset.publicId}</span> ({reconcileAsset.resourceType}) to a provider.
            </p>
            <div className="mt-3">
              <div className="text-[12px] font-medium text-[var(--color-text-secondary)] mb-1">Preview</div>
              <div className="rounded-[8px] overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-raised)] h-40 flex items-center justify-center">
                {reconcileAsset.thumbnailUrl || reconcileAsset.resourceType === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={reconcileAsset.thumbnailUrl ?? reconcileAsset.url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Film size={22} color="var(--color-accent)" />
                )}
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-[12px] font-medium text-[var(--color-text-secondary)]">Provider (search)</label>
                <div className="flex gap-2 mt-1">
                  <input
                    value={providerQuery}
                    onChange={(e) => setProviderQuery(e.target.value)}
                    placeholder="Type name to search..."
                    className="flex-1 h-9 px-3 rounded-[8px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[13px]"
                  />
                </div>
                <div className="max-h-[140px] overflow-auto border border-[var(--color-border)] rounded-[8px] mt-1 bg-[var(--color-surface-raised)]">
                  {providerOptions.length === 0 ? (
                    <div className="p-3 text-[12px] text-[var(--color-text-tertiary)]">No providers found — try a different search.</div>
                  ) : (
                    providerOptions.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setProviderId(p.id);
                          setProviderName(p.displayName);
                        }}
                        className={`w-full text-left px-3 py-2 text-[13px] cursor-pointer border-none ${providerId === p.id ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)]" : "bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]"}`}
                      >
                        {p.displayName} <span className="text-[11px] opacity-60">· {p.categorySlug}</span>
                      </button>
                    ))
                  )}
                </div>
                {providerId && <div className="text-[11px] text-[var(--color-accent)] mt-1">Selected: {providerName} ({providerId.slice(0, 8)}…)</div>}
              </div>
              <div>
                <label className="text-[12px] font-medium text-[var(--color-text-secondary)]">Attach as</label>
                <div className="flex gap-2 mt-1">
                  {(["portfolio", "avatar", "cover"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setReconcileTarget(t)}
                      className={`flex-1 h-9 rounded-[8px] text-[12px] font-medium cursor-pointer border ${reconcileTarget === t ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)] border-[var(--color-accent)]" : "bg-transparent text-[var(--color-text-secondary)] border-[var(--color-border)]"}`}
                    >
                      {t === "portfolio" ? "Portfolio item" : t === "avatar" ? "Avatar" : "Cover video"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <ClButton variant="ghost" onClick={() => setReconcileAsset(null)}>Cancel</ClButton>
              <ClButton variant="primary" loading={reconciling} onClick={handleReconcile} disabled={!providerId}>
                Attach
              </ClButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
