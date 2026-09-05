"use client";

import Link from "next/link";
import { Film, Image as ImageIcon, EyeOff, ImageOff } from "lucide-react";

interface GalleryItem {
  id: string;
  title: string | null;
  url: string;
  thumbnailUrl: string | null;
  mimeType: string;
  source: string;
  visible: boolean;
  orderIndex: number;
}

export function PortfolioGalleryGrid({ items }: { items: GalleryItem[] }) {
  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-[var(--color-border)] rounded-[12px] bg-[var(--color-surface-raised)]/50">
        <div className="w-12 h-12 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-center mb-3">
          <ImageOff size={20} strokeWidth={1.5} color="var(--color-text-tertiary)" />
        </div>
        <p className="text-[14px] font-medium text-[var(--color-text-secondary)]">No portfolio items yet</p>
        <p className="text-[12px] text-[var(--color-text-tertiary)] mt-1 max-w-[320px]">
          Upload media and add items to your portfolio — they will appear here and on your public profile.
        </p>
        <Link
          href="/profile/media"
          className="mt-4 inline-flex h-9 items-center px-4 rounded-[8px] bg-[var(--color-accent)] text-[var(--color-text-inverse)] text-[13px] font-semibold no-underline"
        >
          Add portfolio item
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.slice(0, 8).map((item) => {
        const isVideo = item.mimeType.startsWith("video/");
        const thumb = item.thumbnailUrl;
        return (
          <div
            key={item.id}
            className="group relative rounded-[12px] overflow-hidden bg-[var(--color-surface-raised)] border border-[var(--color-border)] aspect-[4/5] flex flex-col"
          >
            <div className="flex-1 relative overflow-hidden bg-[var(--color-bg)]">
              {thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb} alt={item.title ?? "Portfolio"} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300" />
              ) : isVideo ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Film size={28} strokeWidth={1.5} color="var(--color-accent)" />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon size={28} strokeWidth={1.5} color="var(--color-text-tertiary)" />
                </div>
              )}
              {!item.visible && (
                <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/60 text-white text-[11px] font-medium">
                    <EyeOff size={12} /> Hidden
                  </span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              {isVideo && (
                <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-medium">HD</div>
              )}
            </div>
            <div className="p-2.5 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
              <p className="text-[12px] font-medium text-[var(--color-text-primary)] truncate">{item.title ?? "Untitled"}</p>
              <p className="text-[11px] text-[var(--color-text-tertiary)] truncate">{item.mimeType} · {item.source}</p>
            </div>
          </div>
        );
      })}
      {items.length > 8 && (
        <Link
          href="/profile/media"
          className="rounded-[12px] border border-dashed border-[var(--color-border-mid)] bg-[var(--color-surface-raised)]/60 flex flex-col items-center justify-center aspect-[4/5] text-[13px] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] no-underline transition-colors"
        >
          +{items.length - 8} more
        </Link>
      )}
    </div>
  );
}
