"use client";

import { useState } from "react";
import { Play } from "lucide-react";
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

  const isVideo = item.mimeType.startsWith("video/");
  const isPdf = item.mimeType === "application/pdf";

  return (
    <div
      className={`group relative overflow-hidden rounded-[12px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] cursor-pointer ${sizeStyles[size]}`}
      onClick={() => onPlay?.(item)}
    >
      {item.thumbnailUrl ? (
        <div className="absolute inset-0">
          <img
            src={item.thumbnailUrl}
            alt={item.title ?? "Portfolio item"}
            className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setLoaded(true)}
          />
          {!loaded && (
            <div className="absolute inset-0 bg-[var(--color-surface-raised)] animate-pulse" />
          )}
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-surface-raised)]">
          <span className="text-[var(--color-text-tertiary)] text-[13px]">
            {item.title ?? "No preview"}
          </span>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-[rgba(0,0,0,0.7)] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

      {(isVideo || isPdf) && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="w-12 h-12 rounded-full bg-[rgba(0,0,0,0.6)] backdrop-blur-[2px] flex items-center justify-center border border-[rgba(255,255,255,0.15)]">
            <Play size={18} fill="white" color="white" />
          </div>
        </div>
      )}

      {item.title && (
        <div className="absolute bottom-0 left-0 right-0 p-2.5">
          <p className="text-[12px] font-medium text-white truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
            {item.title}
          </p>
        </div>
      )}

      {isVideo && (
        <div className="absolute top-2 right-2">
          <span className="px-1.5 py-0.5 rounded-[4px] bg-[rgba(0,0,0,0.6)] backdrop-blur-[2px] text-[10px] font-medium text-white">
            HD
          </span>
        </div>
      )}

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
