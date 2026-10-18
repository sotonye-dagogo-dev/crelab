import { db } from "@/lib/db";
import { providers } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";
import {
  validateFolderUrl,
  parseFolderId,
  fetchAllFiles,
  fetchFileList,
  fetchDriveFolderMetadata,
  isSupportedMimeType,
  getSupportedMimeType,
  buildStableDriveThumbnailUrl,
  DRIVE_LIMITS,
  PREVIEW_SAMPLE_MAX,
  DriveAccessError,
  DriveRateLimitError,
  DriveValidationError,
} from "@/lib/drive";
import { PortfolioService } from "@/services/PortfolioService";
import type { IPortfolioItem } from "@/types";

export interface DriveIngestResult {
  added: number;
  updated: number;
  hidden: number;
  total: number;
  /** True when the folder held more files than the per-ingest cap (DRIVE_MAX_FILES_PER_FOLDER) allowed. */
  truncated: boolean;
}

export type DrivePreviewKind = "video" | "image" | "pdf" | "other";

export interface DrivePreviewItem {
  id: string;
  name: string;
  mimeType: string;
  kind: DrivePreviewKind;
  /** False = the file exists but sync would skip it (unsupported format). */
  supported: boolean;
  /** Stable, unsigned Drive thumbnail (never the signed ~1h-TTL API link). */
  thumbnailUrl: string | null;
}

export interface DrivePreviewResult {
  folderId: string;
  folderName: string;
  /** Files inspected in this preview (bounded by DRIVE_PREVIEW_MAX_FILES). */
  sampleSize: number;
  supported: number;
  unsupported: number;
  /** True when more files exist beyond the sample (sample is not the whole folder). */
  sampled: boolean;
  items: DrivePreviewItem[];
  /** ISO timestamp of when Google answered — provenance for the "API test" UX. */
  checkedAt: string;
}

export interface IDriveService {
  validateFolderUrl(url: string): boolean;
  ingestFolder(providerId: string, folderUrl: string): Promise<DriveIngestResult>;
  previewFolder(folderUrl: string): Promise<DrivePreviewResult>;
  syncAll(): Promise<{ synced: number; errors: string[]; rateLimited: boolean }>;
}

function previewKind(mimeType: string): DrivePreviewKind {
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";
  return "other";
}

export class DriveService implements IDriveService {
  validateFolderUrl(url: string): boolean {
    return validateFolderUrl(url);
  }

  async ingestFolder(
    providerId: string,
    folderUrl: string,
  ): Promise<DriveIngestResult> {
    if (!validateFolderUrl(folderUrl)) {
      throw new DriveValidationError("Invalid Google Drive folder URL");
    }

    const folderId = parseFolderId(folderUrl);
    if (!folderId) {
      throw new DriveValidationError("Could not extract folder ID from URL");
    }

    let driveResult;
    try {
      driveResult = await fetchAllFiles(folderId);
    } catch (err) {
      if (err instanceof DriveAccessError) throw err;
      throw new DriveAccessError(
        `Failed to fetch files: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
    const { files: driveFiles, truncated } = driveResult;

    const supportedFiles = driveFiles.filter((f) =>
      isSupportedMimeType(f.mimeType),
    );

    const existingItems = await PortfolioService.getAllByProvider(providerId);
    const existingByDriveId = new Map(
      existingItems
        .filter((item) => item.driveFileId)
        .map((item) => [item.driveFileId!, item]),
    );

    const syncedDriveIds = new Set<string>();
    let added = 0;
    let updated = 0;

    for (const file of supportedFiles) {
      syncedDriveIds.add(file.id);
      const existing = existingByDriveId.get(file.id);

      const mimeType = getSupportedMimeType(file.mimeType) ?? file.mimeType;
      // Hot-link expiry trap: the API's thumbnailLink is a signed googleusercontent.com
      // URL that expires within the hour — caching it permanently breaks tiles later.
      // Store the stable, unsigned thumbnail endpoint instead (public-share required
      // for API-key access anyway), so the URL never goes stale in the DB.
      const thumbnailUrl = buildStableDriveThumbnailUrl(file.id);

      if (existing) {
        await PortfolioService.updateItem(existing.id, {
          title: file.name,
          thumbnailUrl,
          url: file.webViewLink,
        } as Partial<IPortfolioItem>);
        updated++;
      } else {
        await PortfolioService.addItem({
          providerId,
          source: "DRIVE" as IPortfolioItem["source"],
          url: file.webViewLink,
          thumbnailUrl: thumbnailUrl ?? undefined,
          title: file.name,
          driveFileId: file.id,
          mimeType,
        });
        added++;
      }
    }

    let hidden = 0;
    for (const item of existingItems) {
      if (item.driveFileId && !syncedDriveIds.has(item.driveFileId) && item.visible) {
        await PortfolioService.setHidden(item.id, false);
        hidden++;
      }
    }

    return { added, updated, hidden, total: supportedFiles.length, truncated };
  }

  /**
   * Read-only link check: confirms the pasted folder URL resolves against the
   * Google Drive API and returns a bounded sample so the user (and we) can see
   * what a sync would import — WITHOUT touching the DB (no portfolio_items,
   * no providers.drive_folder_url writes). Budget: 1–2 throttled API calls
   * (folder metadata + first page), capped at DRIVE_PREVIEW_MAX_FILES items.
   */
  async previewFolder(folderUrl: string): Promise<DrivePreviewResult> {
    if (!validateFolderUrl(folderUrl)) {
      throw new DriveValidationError("Invalid Google Drive folder URL");
    }

    const folderId = parseFolderId(folderUrl);
    if (!folderId) {
      throw new DriveValidationError("Could not extract folder ID from URL");
    }

    const maxSample = Math.min(
      Math.max(DRIVE_LIMITS.previewMaxFiles, 1),
      PREVIEW_SAMPLE_MAX,
    );

    const meta = await fetchDriveFolderMetadata(folderId);
    // A pasted /file/d/… id (or a bogus URL) can resolve to a non-folder —
    // fail with actionable copy rather than listing an unrelated parent.
    if (!meta.isFolder) {
      throw new DriveValidationError(
        "That link points to a file, not a folder. Paste a Drive folder link (…/drive/folders/…).",
      );
    }

    const list = await fetchFileList(folderId, undefined, {
      pageSize: maxSample,
    });

    const items: DrivePreviewItem[] = list.files.map((file) => {
      const supported = isSupportedMimeType(file.mimeType);
      const kind = previewKind(file.mimeType);
      return {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        kind,
        supported,
        // Stable unsigned endpoint only for renderable media; unsupported /
        // unknown types get no thumb (avoids guaranteed-broken <img> requests).
        thumbnailUrl:
          supported && kind !== "other"
            ? buildStableDriveThumbnailUrl(file.id)
            : null,
      };
    });

    const supportedCount = items.filter((item) => item.supported).length;

    return {
      folderId,
      folderName: meta.name,
      sampleSize: items.length,
      supported: supportedCount,
      unsupported: items.length - supportedCount,
      sampled: Boolean(list.nextPageToken),
      items,
      checkedAt: new Date().toISOString(),
    };
  }

  async syncAll(): Promise<{ synced: number; errors: string[]; rateLimited: boolean }> {
    const allProviders = await db
      .select()
      .from(providers)
      .where(
        and(
          eq(providers.active, true),
          eq(providers.verified, true),
        ),
      );

    let synced = 0;
    let rateLimited = false;
    const errors: string[] = [];

    for (const provider of allProviders) {
      if (!provider.driveFolderUrl) continue;

      // Rate limits apply globally to the Cloud Project — once Google starts
      // throttling, continuing through the remaining providers would only burn
      // more of the (shared) budget. Skip the rest; the next cron run picks up.
      if (rateLimited) {
        errors.push(
          `${provider.displayName}: skipped — Google Drive rate limit was reached earlier in this run`,
        );
        continue;
      }

      try {
        await this.ingestFolder(provider.id, provider.driveFolderUrl);
        synced++;
      } catch (err) {
        if (err instanceof DriveRateLimitError) {
          rateLimited = true;
          errors.push(`${provider.displayName}: ${err.message}`);
          continue;
        }
        errors.push(
          `${provider.displayName}: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      }
    }

    return { synced, errors, rateLimited };
  }
}
