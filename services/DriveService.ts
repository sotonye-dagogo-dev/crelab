import { db } from "@/lib/db";
import { portfolioItems, providers } from "@/drizzle/schema";
import { eq, and, inArray } from "drizzle-orm";
import {
  validateFolderUrl,
  parseFolderId,
  fetchAllFiles,
  isSupportedMimeType,
  getSupportedMimeType,
  DriveAccessError,
  DriveValidationError,
} from "@/lib/drive";
import { generateVideoThumbnail } from "@/lib/cloudinary";
import { PortfolioService } from "@/services/PortfolioService";
import type { IPortfolioItem } from "@/types";

export interface DriveIngestResult {
  added: number;
  updated: number;
  hidden: number;
  total: number;
}

export interface IDriveService {
  validateFolderUrl(url: string): boolean;
  ingestFolder(providerId: string, folderUrl: string): Promise<DriveIngestResult>;
  syncAll(): Promise<{ synced: number; errors: string[] }>;
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

    let driveFiles;
    try {
      driveFiles = await fetchAllFiles(folderId);
    } catch (err) {
      if (err instanceof DriveAccessError) throw err;
      throw new DriveAccessError(
        `Failed to fetch files: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }

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
      // Tightened end-to-end: prefer Drive's own thumbnailLink (already CDN-cached), but ensure
      // it is not the low-res "=s220" variant alone — upgrade to =s600 when possible for portfolio quality.
      // For video without thumbnailLink, fall back to Cloudinary thumb helper only if URL is Cloudinary; else keep null and let UI render video element.
      let thumbnailUrl: string | null = file.thumbnailLink
        ? file.thumbnailLink.replace(/=s\d+$/, "=s600")
        : null;
      if (!thumbnailUrl && mimeType.startsWith("video/")) {
        const isCloudinaryUrl = file.webViewLink.includes("res.cloudinary.com");
        thumbnailUrl = isCloudinaryUrl ? generateVideoThumbnail(file.webViewLink) : null;
      }

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

    return { added, updated, hidden, total: supportedFiles.length };
  }

  async syncAll(): Promise<{ synced: number; errors: string[] }> {
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
    const errors: string[] = [];

    for (const provider of allProviders) {
      if (!provider.driveFolderUrl) continue;

      try {
        await this.ingestFolder(provider.id, provider.driveFolderUrl);
        synced++;
      } catch (err) {
        errors.push(
          `${provider.displayName}: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      }
    }

    return { synced, errors };
  }
}
