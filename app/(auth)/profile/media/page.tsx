"use client";

import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ClButton,
  ClBadge,
  ClConfirmDialog,
  ClEmptyState,
  ClBackButton,
  ClCard,
} from "@/components/ui";
import { useToast } from "@/lib/toast";
import { Film, RefreshCw, Trash2, CloudOff, PlusCircle, Link2 } from "lucide-react";
import { MediaUpload } from "@/components/profile/MediaUpload";
import { DriveConnectSettings } from "@/components/profile/DriveConnectSettings";
import type { IMediaAsset } from "@/types";

interface MediaStatus {
  enabled: boolean;
  cloudinaryConfigured: boolean;
  cloudinaryAdminConfigured: boolean;
  cleanupEnabled: boolean;
  cleanupOrphanAfterHours: number;
  maxFileSizeMb: number;
}

interface MyProfile {
  id: string;
  slug: string;
  driveFolderUrl: string | null;
  packages: { id: string; label: string }[];
  portfolio: { id: string; title: string | null; visible: boolean }[];
}

export default function ProfileMediaPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [assetToDelete, setAssetToDelete] = useState<IMediaAsset | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [showAddMedia, setShowAddMedia] = useState(false);
  const [newMediaUrl, setNewMediaUrl] = useState("");

  const { data: assets = [], isLoading } = useQuery<IMediaAsset[]>({
    queryKey: ["my-media"],
    queryFn: async () => {
      const res = await fetch("/api/media/assets");
      const json = await res.json();
      if (json.success) return json.data ?? [];
      throw new Error(json.error ?? "Failed to load your media");
    },
  });

  const { data: status } = useQuery<MediaStatus>({
    queryKey: ["media-status"],
    queryFn: async () => {
      const res = await fetch("/api/media/status");
      const json = await res.json();
      if (json.success) return json.data ?? {};
      throw new Error(json.error ?? "Failed to load upload settings");
    },
  });

  const { data: profile } = useQuery<MyProfile | null>({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const res = await fetch("/api/profile");
      const json = await res.json();
      if (json.success) return json.data ?? null;
      return null;
    },
  });

  const deleteAsset = async () => {
    if (!assetToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/media/assets/${assetToDelete.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to delete asset");
      toast("Media asset deleted", "info");
      queryClient.invalidateQueries({ queryKey: ["my-media"] });
      setAssetToDelete(null);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Delete failed", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleReplaceFile = async (asset: IMediaAsset, file: File | null) => {
    if (!file) return;
    setReplacingId(asset.id);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/media/assets/${asset.id}/replace`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Replace failed");
      toast(
        `Asset replaced${json.data.referencesUpdated ? ` · ${json.data.referencesUpdated} reference(s) updated` : ""}`,
        "success",
      );
      queryClient.invalidateQueries({ queryKey: ["my-media"] });
    } catch (err) {
      toast(err instanceof Error ? err.message : "Replace failed", "error");
    } finally {
      setReplacingId(null);
      if (fileInputRefs.current[asset.id]) fileInputRefs.current[asset.id]!.value = "";
    }
  };

  if (isLoading) {
    return (
      <div className="text-[var(--color-text-secondary)] text-[14px]">
        Loading your media...
      </div>
    );
  }

  const uploadDisabled = !status?.enabled || !status.cloudinaryConfigured;

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 md:px-6">
      <ClBackButton href="/profile" label="Back to profile" className="mb-6" />
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] font-bold text-[24px] tracking-[-0.01em]">
          My Media
        </h1>
        <p className="text-[13px] text-[var(--color-text-secondary)] mt-1">
          Upload new files, connect your Google Drive portfolio, or manage files
          you&apos;ve already uploaded. Replace a file to update it everywhere
          it&apos;s used, or delete it to free storage.
        </p>
      </div>

      {/* Add-new media card */}
      <ClCard className="p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <PlusCircle size={17} strokeWidth={1.8} color="var(--color-accent)" />
            <h2 className="font-[family-name:var(--font-display)] font-bold text-[16px]">
              Add new media
            </h2>
          </div>
          <ClButton
            variant="ghost"
            size="sm"
            onClick={() => setShowAddMedia((v) => !v)}
          >
            {showAddMedia ? "Hide" : "Show"}
          </ClButton>
        </div>

        {showAddMedia && (
          <div className="flex flex-col gap-4">
            <MediaUpload
              label="Upload a file"
              accept="both"
              hint="Uploads are recorded to your library and can be referenced by your portfolio or profile."
              value={newMediaUrl}
              onChange={(url) => {
                setNewMediaUrl(url);
                if (url) {
                  toast("Media uploaded to your library", "success");
                  queryClient.invalidateQueries({ queryKey: ["my-media"] });
                  setShowAddMedia(false);
                  setNewMediaUrl("");
                }
              }}
            />
            <p className="text-[12px] text-[var(--color-text-tertiary)]">
              <Link2 size={12} strokeWidth={1.8} className="inline mr-1" />
              Prefer a link? Paste a public URL (Google Drive, YouTube, etc.) —
              you can add it to your portfolio without uploading a file.
            </p>
          </div>
        )}
      </ClCard>

      {/* Google Drive connect for creator accounts */}
      {profile && (
        <div className="mb-6">
          <DriveConnectSettings
            currentUrl={profile.driveFolderUrl}
            providerId={profile.id}
            mode="live"
            onStateChange={() => {
              queryClient.invalidateQueries({ queryKey: ["my-profile"] });
            }}
            onUrlChange={() => {
              queryClient.invalidateQueries({ queryKey: ["my-profile"] });
            }}
          />
        </div>
      )}

      {uploadDisabled && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] text-[13px] text-[var(--color-text-secondary)]">
          <CloudOff size={16} strokeWidth={1.8} color="var(--color-warning)" />
          Direct uploads are currently unavailable. You can still paste links
          when adding media.
        </div>
      )}

      <div className="mb-4">
        <h2 className="font-[family-name:var(--font-display)] font-bold text-[16px]">
          Uploaded files
        </h2>
        <p className="text-[12px] text-[var(--color-text-tertiary)] mt-0.5">
          {assets.length} file{assets.length === 1 ? "" : "s"} in your library
        </p>
      </div>

      {assets.length === 0 ? (
        <ClEmptyState
          title="No uploads yet"
          message="Files you upload to your profile or portfolio will appear here, where you can replace or delete them."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="flex items-center gap-4 p-4 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)]"
            >
              <div className="w-20 h-20 rounded-[10px] overflow-hidden bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex-shrink-0">
                {asset.resourceType === "video" ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Film size={22} strokeWidth={1.5} color="var(--color-accent)" />
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={asset.thumbnailUrl ?? asset.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-[family-name:var(--font-mono)] text-[12px] text-[var(--color-text-primary)] truncate">
                    {asset.publicId}
                  </span>
                  <ClBadge variant={asset.referenced ? "success" : "warning"}>
                    {asset.referenced ? "In use" : "Orphan"}
                  </ClBadge>
                </div>
                <div className="text-[11px] text-[var(--color-text-tertiary)] truncate mt-0.5">
                  {asset.url}
                </div>
                <div className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5">
                  {asset.resourceType} · uploaded{" "}
                  {new Date(asset.createdAt).toLocaleDateString()}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {!uploadDisabled && (
                  <>
                    <input
                      ref={(el) => {
                        fileInputRefs.current[asset.id] = el;
                      }}
                      type="file"
                      className="hidden"
                      onChange={(e) =>
                        handleReplaceFile(asset, e.target.files?.[0] ?? null)
                      }
                    />
                    <ClButton
                      variant="outlined"
                      size="sm"
                      loading={replacingId === asset.id}
                      onClick={() => fileInputRefs.current[asset.id]?.click()}
                    >
                      <RefreshCw size={13} strokeWidth={1.8} />
                      Replace
                    </ClButton>
                  </>
                )}
                <button
                  onClick={() => setAssetToDelete(asset)}
                  disabled={deleting}
                  aria-label="Delete asset"
                  className="inline-flex items-center gap-1 text-[12px] text-[var(--color-error)] cursor-pointer bg-transparent border-none p-0 disabled:opacity-50"
                >
                  <Trash2 size={14} strokeWidth={1.8} />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ClConfirmDialog
        open={assetToDelete !== null}
        title="Delete media asset"
        message={`Permanently remove "${assetToDelete?.publicId}" from Cloudinary and clear it from any profile or portfolio that references it. This cannot be undone.`}
        confirmLabel="Delete asset"
        loading={deleting}
        onConfirm={deleteAsset}
        onCancel={() => setAssetToDelete(null)}
      />
    </div>
  );
}