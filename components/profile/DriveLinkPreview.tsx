"use client";

import { useState } from "react";
import { CheckCircle, Eye, FileText, Film, Image as ImageIcon, AlertTriangle } from "lucide-react";
import type { DrivePreviewItem, DrivePreviewResult } from "@/services/DriveService";

interface DriveLinkPreviewProps {
  result: DrivePreviewResult;
}

function kindIcon(kind: DrivePreviewItem["kind"], size = 20) {
  if (kind === "video") return <Film size={size} strokeWidth={1.5} />;
  if (kind === "image") return <ImageIcon size={size} strokeWidth={1.5} />;
  if (kind === "pdf") return <FileText size={size} strokeWidth={1.5} />;
  return <FileText size={size} strokeWidth={1.5} />;
}

/**
 * Read-only Drive link preview card: folder name, sample thumbnails (stable
 * unsigned Drive endpoints — never signed ~1h-TTL links) and the supported /
 * skipped split a sync would produce. Explicitly reassures the user that
 * nothing has been written yet.
 */
export function DriveLinkPreview({ result }: DriveLinkPreviewProps) {
  const [failedThumbs, setFailedThumbs] = useState<Record<string, boolean>>({});

  const visibleItems = result.items.slice(0, 8);

  return (
    <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4">
      <div className="flex items-start gap-2 mb-1">
        <CheckCircle
          size={16}
          fill="var(--color-success)"
          color="var(--color-surface)"
          className="mt-[2px] shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-[var(--color-success)]">
            Link looks good
          </p>
          <p className="text-[12px] text-[var(--color-text-secondary)] break-words">
            {result.folderName || "Google Drive folder"} is publicly reachable.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 mb-3 text-[12px]">
        <span className="text-[var(--color-text-secondary)]">
          <span className="font-semibold text-[var(--color-text-primary)]">
            {result.supported}
          </span>{" "}
          ready to sync
        </span>
        {result.unsupported > 0 && (
          <span className="text-[var(--color-text-tertiary)]">
            <span className="font-semibold text-[var(--color-text-primary)]">
              {result.unsupported}
            </span>{" "}
            skipped (unsupported format)
          </span>
        )}
        <span className="text-[var(--color-text-tertiary)]">
          First {result.sampleSize} checked
          {result.sampled ? " (more in folder)" : ""}
        </span>
      </div>

      {visibleItems.length === 0 ? (
        <p className="text-[12px] text-[var(--color-text-tertiary)] rounded-[8px] bg-[var(--color-surface)] border border-[var(--color-border)] px-3 py-3">
          This folder is empty — add some videos, images, or PDFs, then sync.
        </p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
          {visibleItems.map((item) => {
            const thumbFailed = failedThumbs[item.id];
            return (
              <div
                key={item.id}
                className="relative overflow-hidden rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] aspect-video"
                title={item.name}
              >
                {item.thumbnailUrl && !thumbFailed ? (
                  <img
                    src={item.thumbnailUrl}
                    alt={item.name}
                    loading="lazy"
                    className="w-full h-full object-cover"
                    onError={() =>
                      setFailedThumbs((prev) => ({ ...prev, [item.id]: true }))
                    }
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[var(--color-text-tertiary)]">
                    {kindIcon(item.kind)}
                  </div>
                )}

                {item.kind === "video" && (
                  <span className="absolute left-1 bottom-1 flex items-center gap-1 rounded-[4px] bg-black/65 px-1.5 py-[2px] text-[9px] font-medium text-white">
                    <Film size={9} strokeWidth={2} />
                    Video
                  </span>
                )}
                {!item.supported && (
                  <span className="absolute right-1 top-1 rounded-[4px] bg-[var(--color-error)]/85 px-1.5 py-[2px] text-[9px] font-medium text-white">
                    Skipped
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {result.sampleSize > 0 && result.supported === 0 && (
        <div className="flex items-start gap-2 mb-2 text-[12px] text-[var(--color-warning)]">
          <AlertTriangle size={13} strokeWidth={1.8} className="mt-[1px] shrink-0" />
          <span>
            No supported formats found in this sample — syncing would import
            nothing. Supported: MP4, WebM, MOV, AVI, JPEG, PNG, WebP, PDF.
          </span>
        </div>
      )}

      <p className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-tertiary)]">
        <Eye size={12} strokeWidth={1.8} />
        Read-only check against Google — nothing has been saved yet. Connect
        &amp; Sync to import these into your portfolio.
      </p>
    </div>
  );
}
