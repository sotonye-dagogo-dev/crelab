import type { IPortfolioItem } from "@/types";
import { PortfolioItemSource } from "@/types";

/**
 * Sanitized, short, unique asset label.
 * Uses provider display name + 1-based index among provider's assets + upload date.
 * Example: "Amara Studios #3 · 12 Jan 2024"
 * Never exposes raw DB ids or raw titles as the sole identifier.
 */
export function formatAssetLabel(
  item: IPortfolioItem,
  providerName: string | undefined,
  indexOneBased: number,
): string {
  const name = sanitizeProviderName(providerName ?? "Portfolio");
  const d = new Date(item.createdAt);
  const dateStr = isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const base = `${name} #${indexOneBased}`;
  return dateStr ? `${base} · ${dateStr}` : base;
}

function sanitizeProviderName(name: string): string {
  // keep letters/numbers/spaces, trim to 24 chars, Title-case-ish
  const cleaned = name.replace(/[^a-zA-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return "Portfolio";
  return cleaned.length > 24 ? `${cleaned.slice(0, 24).trim()}…` : cleaned;
}

/**
 * Deduplicate portfolio items that would otherwise render redundantly.
 * Two rows are considered the same asset when they share a driveFileId (Drive)
 * or the same canonical URL (DIRECT / DRIVE fallback). Keeps first occurrence
 * preserving orderIndex ordering.
 */
export function dedupePortfolioItems(items: IPortfolioItem[]): IPortfolioItem[] {
  const seenDriveIds = new Set<string>();
  const seenUrls = new Set<string>();
  const out: IPortfolioItem[] = [];
  for (const item of items) {
    const driveId = item.driveFileId?.trim();
    if (driveId) {
      if (seenDriveIds.has(driveId)) continue;
      seenDriveIds.add(driveId);
    }
    const normUrl = normalizeUrl(item.url);
    if (normUrl) {
      if (seenUrls.has(normUrl)) continue;
      seenUrls.add(normUrl);
    }
    out.push(item);
  }
  return out;
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    // ignore tracking params that don't change the underlying asset
    u.searchParams.delete("utm_source");
    u.searchParams.delete("utm_medium");
    return u.toString().toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

/** Whether this item is a video — used for badge/overlay decisions. */
export function isVideoItem(item: Pick<IPortfolioItem, "mimeType"> | { mimeType?: string | null }): boolean {
  return !!item.mimeType && item.mimeType.startsWith("video/");
}

/**
 * Cover fallback: any uploaded cover (video OR photo) must surface as a
 * portfolio/content item, while the display picture (avatarUrl / user.image)
 * must NEVER surface. The providers table only stores covers in
 * `coverVideoUrl` (which may hold an image URL when the user uploaded a
 * photo as cover), so this helper treats that single field as the cover —
 * never the avatar.
 */
export function isImageCoverUrl(url: string): boolean {
  return /\.(jpe?g|png|webp|gif|avif|heic)(\?.*)?$/i.test(url.trim());
}

export function coverMimeType(url: string): string {
  const lower = url.trim().toLowerCase();
  if (/\.png(\?|$)/.test(lower)) return "image/png";
  if (/\.webp(\?|$)/.test(lower)) return "image/webp";
  if (/\.gif(\?|$)/.test(lower)) return "image/gif";
  if (/\.avif(\?|$)/.test(lower)) return "image/avif";
  if (/\.(jpe?g|heic)(\?|$)/.test(lower)) return "image/jpeg";
  if (/\.(mp4|webm|mov|m4v)(\?|$)/.test(lower)) return "video/mp4";
  if (/\.avi(\?|$)/.test(lower)) return "video/x-msvideo";
  // Cloudinary delivery URLs without an extension: guess from the resource-type segment.
  if (/\/video\/upload\//.test(lower)) return "video/mp4";
  if (/\/image\/upload\//.test(lower)) return "image/jpeg";
  return "video/mp4";
}

/**
 * Build the synthetic portfolio item for a provider cover. Deterministic id
 * (`cover-<providerId>`) so repeated merges never duplicate and React keys
 * stay stable. Image covers use the cover itself as thumbnail; video covers
 * leave thumbnail resolution to the caller (Cloudinary-derived when possible).
 */
export function buildCoverFallbackItem(
  providerId: string,
  coverUrl: string,
  thumbnailUrl?: string | null,
): IPortfolioItem {
  const url = coverUrl.trim();
  const image = isImageCoverUrl(url);
  const now = new Date().toISOString();
  return {
    id: `cover-${providerId}`,
    providerId,
    source: PortfolioItemSource.DIRECT,
    url,
    thumbnailUrl: thumbnailUrl ?? (image ? url : null),
    title: "Cover",
    caption: null,
    driveFileId: null,
    mimeType: coverMimeType(url),
    orderIndex: -1,
    visible: true,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Merge a provider cover into an already-fetched portfolio list. No-op when
 * the cover is blank or already present (same normalized URL) — so real
 * portfolio rows added by the write path always win and the fallback never
 * duplicates. Never takes an avatar: callers must only pass coverVideoUrl.
 */
export function withCoverFallback(
  items: IPortfolioItem[],
  providerId: string,
  coverUrl: string | null | undefined,
  thumbnailUrl?: string | null,
): IPortfolioItem[] {
  if (!coverUrl || !coverUrl.trim()) return items;
  const normCover = coverUrl.trim().toLowerCase();
  if (items.some((it) => it.url.trim().toLowerCase() === normCover)) return items;
  return [buildCoverFallbackItem(providerId, coverUrl, thumbnailUrl), ...items];
}

/** Serialized key for system propagation (index suffixed) */
export function assetSerialKey(providerSlugOrName: string, index: number): string {
  return `${providerSlugOrName}-${String(index).padStart(3, "0")}`;
}
