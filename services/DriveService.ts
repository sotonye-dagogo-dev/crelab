import { db } from "@/lib/db";
import { providers } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";
import {
  validateFolderUrl,
  parseFolderId,
  fetchAllFiles,
  isSupportedMimeType,
  getSupportedMimeType,
  buildStableDriveThumbnailUrl,
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

export interface IDriveService {
  validateFolderUrl(url: string): boolean;
  ingestFolder(providerId: string, folderUrl: string): Promise<DriveIngestResult>;
  syncAll(): Promise<{ synced: number; errors: string[]; rateLimited: boolean }>;
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
