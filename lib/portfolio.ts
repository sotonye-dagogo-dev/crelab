import type { IPortfolioItem } from "@/types";

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

/** Serialized key for system propagation (index suffixed) */
export function assetSerialKey(providerSlugOrName: string, index: number): string {
  return `${providerSlugOrName}-${String(index).padStart(3, "0")}`;
}
