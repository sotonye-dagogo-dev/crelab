"use client";

import { useEffect, useCallback, useState, useMemo } from "react";

interface MediaEmbedProps {
  open: boolean;
  onClose: () => void;
  url: string;
  mimeType: string;
  title?: string;
  items?: { id: string; url: string; mimeType: string; title?: string }[];
  currentId?: string;
}

export function MediaEmbed({
  open,
  onClose,
  url,
  mimeType,
  title,
  items,
  currentId,
}: MediaEmbedProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentItems = useMemo(() => items ?? [], [items]);
  const hasMultiple = currentItems.length > 1;

  useEffect(() => {
    if (currentId && currentItems.length > 0) {
      const idx = currentItems.findIndex((item) => item.id === currentId);
      if (idx >= 0) setCurrentIndex(idx);
    }
  }, [currentId, currentItems]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < currentItems.length - 1)
      setCurrentIndex(currentIndex + 1);
  }, [currentIndex, currentItems.length]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft" && hasMultiple) {
        handlePrev();
      } else if (e.key === "ArrowRight" && hasMultiple) {
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, hasMultiple, handlePrev, handleNext]);

  if (!open) return null;

  const currentItem = currentItems[currentIndex];
  const displayUrl = currentItem?.url ?? url;
  const displayMimeType = currentItem?.mimeType ?? mimeType;
  const displayTitle = currentItem?.title ?? title ?? "";
  const isVideo = displayMimeType.startsWith("video/");
  const isImage = displayMimeType.startsWith("image/");
  const isPdf = displayMimeType === "application/pdf";

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-[rgba(10,10,10,0.92)] backdrop-blur-[8px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-[900px] max-h-[90vh] mx-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[14px] text-[var(--color-text-secondary)] truncate">
            {displayTitle}
          </p>
          <button
            onClick={onClose}
            aria-label="Close media viewer"
            className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.1)] flex items-center justify-center cursor-pointer hover:bg-[rgba(255,255,255,0.15)] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="relative bg-[var(--color-bg)] rounded-[12px] overflow-hidden border border-[var(--color-border)]">
          {isVideo && (
            <video
              src={displayUrl}
              controls
              autoPlay
              muted
              aria-label={displayTitle || "Video preview"}
              className="w-full max-h-[80vh] object-contain"
              style={{ aspectRatio: "16/9" }}
            />
          )}

          {isImage && (
            <img
              src={displayUrl}
              alt={displayTitle}
              className="w-full max-h-[80vh] object-contain"
            />
          )}

          {isPdf && (
            <iframe
              src={displayUrl}
              className="w-full h-[80vh] border-0"
              title={displayTitle}
            />
          )}

          {!isVideo && !isImage && !isPdf && (
            <div className="flex items-center justify-center h-[400px]">
              <p className="text-[var(--color-text-tertiary)]">
                Unsupported file type
              </p>
            </div>
          )}
        </div>

        {hasMultiple && (
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              aria-label="Previous item"
              className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.1)] flex items-center justify-center cursor-pointer disabled:opacity-30 hover:bg-[rgba(255,255,255,0.15)] transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            <span className="text-[13px] text-[var(--color-text-tertiary)]">
              {currentIndex + 1} / {currentItems.length}
            </span>

            <button
              onClick={handleNext}
              disabled={currentIndex === currentItems.length - 1}
              aria-label="Next item"
              className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.1)] flex items-center justify-center cursor-pointer disabled:opacity-30 hover:bg-[rgba(255,255,255,0.15)] transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
