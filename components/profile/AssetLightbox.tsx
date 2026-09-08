"use client";

import { X } from "lucide-react";
import { ClDialog } from "@/components/ui";
import { fixLegacyVideoThumbnailUrl } from "@/lib/cloudinary";
import { formatAssetLabel } from "@/lib/portfolio";
import type { IPortfolioItem } from "@/types";

interface AssetLightboxProps {
  item: IPortfolioItem | null;
  providerName?: string;
  indexOneBased?: number;
  onClose: () => void;
}

export function AssetLightbox({ item, providerName, indexOneBased, onClose }: AssetLightboxProps) {
  if (!item) return null;
  const isVideo = item.mimeType.startsWith("video/");
  const isPdf = item.mimeType === "application/pdf";
  const isDrive = item.source === "DRIVE";
  const fixedThumb = fixLegacyVideoThumbnailUrl(item.thumbnailUrl);
  const label = formatAssetLabel(item, providerName ?? item.providerName, indexOneBased ?? 1);
  const isDrivePreviewLink = isDrive && item.url.includes("drive.google.com");

  return (
    <ClDialog open={!!item} onClose={onClose}>
      <div className="relative max-h-[85vh] max-w-[92vw] flex flex-col">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute -top-2 -right-2 z-10 w-8 h-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-secondary)] cursor-pointer hover:text-[var(--color-text-primary)]"
        >
          <X size={16} />
        </button>

        <div className="rounded-[12px] overflow-hidden bg-black flex items-center justify-center min-h-[280px] max-h-[65vh]">
          {isVideo ? (
            isDrivePreviewLink ? (
              <iframe
                src={item.url.replace("/view", "/preview")}
                className="w-full h-[58vh] min-h-[360px] border-0 bg-black"
                allow="autoplay; fullscreen"
                title={label}
              />
            ) : (
              <video
                src={item.url}
                poster={fixedThumb ?? undefined}
                controls
                autoPlay
                playsInline
                className="max-h-[65vh] w-auto max-w-full"
              />
            )
          ) : isPdf ? (
            <iframe src={item.url} className="w-full h-[60vh] border-0 bg-white" title={label} />
          ) : (
            <img
              src={item.url}
              alt={label}
              className="max-h-[65vh] w-auto max-w-full object-contain"
              onError={(e) => {
                if (fixedThumb) (e.currentTarget as HTMLImageElement).src = fixedThumb;
              }}
            />
          )}
        </div>

        <div className="pt-3 flex flex-col gap-1">
          <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">{label}</p>
          {item.caption && (
            <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">{item.caption}</p>
          )}
          <p className="text-[11px] text-[var(--color-text-tertiary)]">
            {item.mimeType} · {item.source === "DRIVE" ? "Google Drive" : "Direct upload"} · {new Date(item.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
          </p>
          {isDrive && !isVideo && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] text-[var(--color-accent)] underline underline-offset-2 mt-1 w-fit"
            >
              Open in Google Drive
            </a>
          )}
        </div>
      </div>
    </ClDialog>
  );
}
