import { db } from "@/lib/db";
import { portfolioItems, providers } from "@/drizzle/schema";
import { eq, and, asc } from "drizzle-orm";
import { fixLegacyVideoThumbnailUrl } from "@/lib/cloudinary";
import type { IPortfolioItem, PortfolioItemSource } from "@/types";

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

  static async setHidden(
    id: string,
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
}

export type { IPortfolioItem };
