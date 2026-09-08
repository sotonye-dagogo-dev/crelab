"use client";

import { useState } from "react";
import { Play, Film } from "lucide-react";
import { fixLegacyVideoThumbnailUrl } from "@/lib/cloudinary";
import { formatAssetLabel } from "@/lib/portfolio";
import type { IPortfolioItem } from "@/types";

interface ExploreVideoCardProps {
  item: IPortfolioItem;
  onPlay?: (item: IPortfolioItem) => void;
  size?: "sm" | "md" | "lg";
}

const sizeStyles = {
  sm: "aspect-[9/16] max-w-[200px]",
  md: "aspect-[9/16] max-w-[260px]",
  lg: "aspect-[9/16] max-w-[320px]",
};

export function ExploreVideoCard({
  item,
  onPlay,
  size = "md",
}: ExploreVideoCardProps) {
  const [loaded, setLoaded] = useState(false);
  const [thumbError, setThumbError] = useState(false);

  const isVideo = item.mimeType.startsWith("video/");
  const isPdf = item.mimeType === "application/pdf";
  const fixedThumb = fixLegacyVideoThumbnailUrl(item.thumbnailUrl);
  const showThumb = !!fixedThumb && !thumbError;
  // sanitized label never exposes raw id; fallback to provider-agnostic short label when provider info absent
  const sanitizedLabel = formatAssetLabel(item, item.providerName ?? undefined, 1);

  return (
    <div
      className={`group relative overflow-hidden rounded-[12px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] cursor-pointer ${sizeStyles[size]}`}
      onClick={() => onPlay?.(item)}
    >
      {showThumb ? (
        <div className="absolute inset-0">
          <img
            src={fixedThumb!}
            alt={item.title ?? "Portfolio item"}
            className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setLoaded(true)}
            onError={() => setThumbError(true)}
          />
          {!loaded && (
            <div className="absolute inset-0 bg-[var(--color-surface-raised)] animate-pulse" />
          )}
        </div>
      ) : isVideo ? (
        <div className="absolute inset-0 bg-[var(--color-surface-raised)]">
          <video
            src={item.url}
            muted
            playsInline
            preload="metadata"
            className="w-full h-full object-cover"
            poster={fixedThumb ?? undefined}
            onError={() => setThumbError(true)}
          />
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-surface-raised)]">
          <span className="text-[var(--color-text-tertiary)] text-[13px]">
            {item.title ?? "No preview"}
          </span>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-[rgba(0,0,0,0.75)] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

      {/* Persistent distinction for video/pdf: tag + centered play overlay (not hover-only) */}
      {isVideo && (
        <>
          <span className="absolute top-2 right-2 z-[2] inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[6px] bg-[rgba(0,0,0,0.72)] border border-white/20 text-white text-[10px] font-semibold tracking-[0.04em] uppercase backdrop-blur-[6px]">
            <Play size={10} fill="white" /> VIDEO
          </span>
          <span className="absolute inset-0 z-[1] flex items-center justify-center pointer-events-none">
            <span className="w-10 h-10 rounded-full bg-[rgba(0,0,0,0.55)] border border-white/15 backdrop-blur-[2px] flex items-center justify-center shadow-[0_2px_12px_rgba(0,0,0,0.35)] group-hover:scale-105 transition-transform">
              <Play size={16} fill="white" color="white" className="translate-x-[1px]" />
            </span>
          </span>
        </>
      )}
      {isPdf && !isVideo && (
        <span className="absolute top-2 right-2 z-[2] inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[6px] bg-[rgba(0,0,0,0.72)] border border-white/20 text-white text-[10px] font-semibold tracking-[0.04em] uppercase backdrop-blur-[6px]">
          <Film size={10} /> PDF
        </span>
      )}
      {/* Hover intensifies overlay but video badge is always visible */}
      {(isVideo || isPdf) && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-[rgba(0,0,0,0.0)]" />
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-2.5">
        <p className="text-[11px] font-medium text-white truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
          {sanitizedLabel}
        </p>
        {item.title && item.title !== sanitizedLabel && (
          <p className="text-[10px] text-white/70 truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">{item.title}</p>
        )}
      </div>

      {isPdf && (
        <div className="absolute top-2 right-2">
          <span className="px-1.5 py-0.5 rounded-[4px] bg-[rgba(0,0,0,0.6)] backdrop-blur-[2px] text-[10px] font-medium text-white">
            PDF
          </span>
        </div>
      )}
    </div>
  );
}
