import { db } from "@/lib/db";
import { portfolioItems, providers } from "@/drizzle/schema";
import { eq, and, asc, desc } from "drizzle-orm";
import { fixLegacyVideoThumbnailUrl } from "@/lib/cloudinary";
import type { IPortfolioItem } from "@/types";
import { PortfolioItemSource } from "@/types";

export interface IPortfolioService {
  getByProvider(providerId: string): Promise<IPortfolioItem[]>;
  addItem(data: {
    providerId: string;
    source: PortfolioItemSource;
    url: string;
    thumbnailUrl?: string;
    title?: string;
    caption?: string;
    driveFileId?: string;
    mimeType: string;
  }): Promise<IPortfolioItem>;
  updateItem(id: string, data: Partial<IPortfolioItem>): Promise<IPortfolioItem>;
  reorder(providerId: string, orderedIds: string[]): Promise<void>;
  setHidden(id: string, visible: boolean): Promise<IPortfolioItem>;
  deleteItem(id: string): Promise<void>;
}

/** Admin-observation row for Drive-integrated portfolio items. */
export interface IDrivePortfolioItemRow {
  id: string;
  providerId: string;
  providerName: string | null;
  driveFolderUrl: string | null;
  title: string | null;
  url: string;
  thumbnailUrl: string | null;
  mimeType: string;
  driveFileId: string | null;
  visible: boolean;
  createdAt: string;
}

function mapItem(row: typeof portfolioItems.$inferSelect): IPortfolioItem {
  return {
    id: row.id,
    providerId: row.providerId,
    source: row.source as IPortfolioItem["source"],
    url: row.url,
    thumbnailUrl: fixLegacyVideoThumbnailUrl(row.thumbnailUrl),
    title: row.title,
    caption: row.caption,
    driveFileId: row.driveFileId,
    mimeType: row.mimeType,
    orderIndex: row.orderIndex,
    visible: row.visible,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function dedupeRows(rows: IPortfolioItem[]): IPortfolioItem[] {
  const seenDrive = new Set<string>();
  const seenUrl = new Set<string>();
  const out: IPortfolioItem[] = [];
  for (const r of rows) {
    if (r.driveFileId && seenDrive.has(r.driveFileId)) continue;
    if (r.driveFileId) seenDrive.add(r.driveFileId);
    const norm = r.url.trim().toLowerCase();
    if (seenUrl.has(norm)) continue;
    seenUrl.add(norm);
    out.push(r);
  }
  return out;
}

export class PortfolioService {
  static async getByProvider(providerId: string): Promise<IPortfolioItem[]> {
    const rows = await db
      .select()
      .from(portfolioItems)
      .where(
        and(
          eq(portfolioItems.providerId, providerId),
          eq(portfolioItems.visible, true),
        ),
      )
      .orderBy(asc(portfolioItems.orderIndex));
    return dedupeRows(rows.map(mapItem));
  }

  static async getAllByProvider(providerId: string): Promise<IPortfolioItem[]> {
    const rows = await db
      .select()
      .from(portfolioItems)
      .where(eq(portfolioItems.providerId, providerId))
      .orderBy(asc(portfolioItems.orderIndex));
    return dedupeRows(rows.map(mapItem));
  }

  static async addItem(data: {
    providerId: string;
    source: PortfolioItemSource;
    url: string;
    thumbnailUrl?: string;
    title?: string;
    caption?: string;
    driveFileId?: string;
    mimeType: string;
  }): Promise<IPortfolioItem> {
    // Idempotent: if an asset with same driveFileId or normalized url already exists, return it (avoids redundant renders)
    const existingAll = await PortfolioService.getAllByProvider(data.providerId);
    const normUrl = data.url.trim().toLowerCase();
    const dup = existingAll.find(
      (it) => (data.driveFileId && it.driveFileId === data.driveFileId) || it.url.trim().toLowerCase() === normUrl,
    );
    if (dup) return dup;

    const maxOrder = await db
      .select({ max: portfolioItems.orderIndex })
      .from(portfolioItems)
      .where(eq(portfolioItems.providerId, data.providerId))
      .then((rows) => Math.max(...rows.map((r) => r.max ?? 0), -1) + 1);

    const [row] = await db
      .insert(portfolioItems)
      .values({
        id: crypto.randomUUID(),
        providerId: data.providerId,
        source: data.source,
        url: data.url,
        thumbnailUrl: data.thumbnailUrl ?? null,
        title: data.title ?? null,
        caption: data.caption ?? null,
        driveFileId: data.driveFileId ?? null,
        mimeType: data.mimeType,
        orderIndex: maxOrder,
      })
      .returning();

    return mapItem(row);
  }

  static async updateItem(
    id: string,
    data: Partial<IPortfolioItem>,
  ): Promise<IPortfolioItem> {
    const [row] = await db
      .update(portfolioItems)
      .set({
        ...(data.title !== undefined && { title: data.title }),
        ...(data.caption !== undefined && { caption: data.caption }),
        ...(data.thumbnailUrl !== undefined && {
          thumbnailUrl: data.thumbnailUrl,
        }),
        ...(data.url !== undefined && { url: data.url }),
      })
      .where(eq(portfolioItems.id, id))
      .returning();
    return mapItem(row);
  }

  static async reorder(
    providerId: string,
    orderedIds: string[],
  ): Promise<void> {
    await db.transaction(async (tx) => {
      for (let i = 0; i < orderedIds.length; i++) {
        await tx
          .update(portfolioItems)
          .set({ orderIndex: i })
          .where(
            and(
              eq(portfolioItems.id, orderedIds[i]),
              eq(portfolioItems.providerId, providerId),
            ),
          );
      }
    });
  }

  /**
   * Attach a freshly uploaded media asset to the uploader's provider portfolio
   * (when the uploader owns one). Uploads otherwise land only in the
   * `media_assets` library as unlinked rows, so provider portfolios and the
   * explore content view would stay empty despite successful uploads.
   *
   * Non-fatal by contract: returns `null` when the owner has no provider
   * profile (e.g. admin uploads — those stay orphan until reconciled via
   * `MediaAssetService.reconcileAsset`), and callers must swallow errors so a
   * portfolio failure never fails the already-recorded upload. Idempotent via
   * the `addItem` duplicate check (same URL → existing row returned).
   */
  static async attachUploadToProvider(
    ownerUserId: string | null,
    asset: {
      url: string;
      thumbnailUrl?: string | null;
      mimeType: string;
      title?: string;
    },
  ): Promise<IPortfolioItem | null> {
    if (!ownerUserId) return null;
    const providerRows = await db
      .select({ id: providers.id })
      .from(providers)
      .where(eq(providers.userId, ownerUserId))
      .limit(1);
    const provider = providerRows[0];
    if (!provider) return null;
    return PortfolioService.addItem({
      providerId: provider.id,
      source: PortfolioItemSource.DIRECT,
      url: asset.url,
      thumbnailUrl: asset.thumbnailUrl ?? undefined,
      title: asset.title,
      mimeType: asset.mimeType,
    });
  }

  static async setHidden(    id: string,
    visible: boolean,
  ): Promise<IPortfolioItem> {
    const [row] = await db
      .update(portfolioItems)
      .set({ visible })
      .where(eq(portfolioItems.id, id))
      .returning();
    return mapItem(row);
  }

  static async deleteItem(id: string): Promise<void> {
    await db.delete(portfolioItems).where(eq(portfolioItems.id, id));
  }

  /**
   * Admin observation list of Drive-integrated portfolio items
   * (source = DRIVE) with their provider context. Bounded read — no Drive API
   * calls, no mutations; the files themselves live in Google Drive so the
   * admin media page only offers view-only actions for these rows.
   */
  static async listDriveItems(limit = 500): Promise<IDrivePortfolioItemRow[]> {
    const capped = Math.min(Math.max(1, limit), 1000);
    const rows = await db
      .select({
        id: portfolioItems.id,
        providerId: portfolioItems.providerId,
        providerName: providers.displayName,
        driveFolderUrl: providers.driveFolderUrl,
        title: portfolioItems.title,
        url: portfolioItems.url,
        thumbnailUrl: portfolioItems.thumbnailUrl,
        mimeType: portfolioItems.mimeType,
        driveFileId: portfolioItems.driveFileId,
        visible: portfolioItems.visible,
        createdAt: portfolioItems.createdAt,
      })
      .from(portfolioItems)
      .leftJoin(providers, eq(providers.id, portfolioItems.providerId))
      .where(eq(portfolioItems.source, "DRIVE"))
      .orderBy(desc(portfolioItems.createdAt))
      .limit(capped);

    return rows.map((r) => ({
      id: r.id,
      providerId: r.providerId,
      providerName: r.providerName ?? null,
      driveFolderUrl: r.driveFolderUrl ?? null,
      title: r.title ?? null,
      url: r.url,
      thumbnailUrl: fixLegacyVideoThumbnailUrl(r.thumbnailUrl),
      mimeType: r.mimeType,
      driveFileId: r.driveFileId ?? null,
      visible: r.visible,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}

export type { IPortfolioItem };
