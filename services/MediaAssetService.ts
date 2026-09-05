import { db } from "@/lib/db";
import {
  mediaAssets,
  providers,
  portfolioItems,
  user,
  blogPosts,
  teamMembers,
} from "@/drizzle/schema";
import { and, desc, eq, isNotNull, like, lt, or } from "drizzle-orm";
import type { IMediaAsset } from "@/types";
import {
  parseCloudinaryUrl,
  deleteAsset,
  isCloudinaryAdminConfigured,
} from "@/lib/cloudinary";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { DEFAULT_CONFIG } from "@/config/platform.config";

export interface CleanupResult {
  enabled: boolean;
  thresholdHours: number;
  candidates: number;
  deleted: number;
  skippedBinary: number;
  errors: string[];
}

export interface DeleteAssetResult {
  deleted: boolean;
  referencesCleared: number;
  binaryDeleted: boolean;
}

type MediaAssetRow = typeof mediaAssets.$inferSelect;

/** Extract the Cloudinary public id from a URL string (null when not Cloudinary). */
export function publicIdFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return parseCloudinaryUrl(url)?.publicId ?? null;
}

/**
 * Pure helper: collect every Cloudinary public id referenced by the given
 * provider rows (cover/avatar) and portfolio rows (url/thumbnail).
 */
export function collectReferencedPublicIds(
  providerRows: Array<{ coverVideoUrl: string | null; avatarUrl: string | null }>,
  portfolioRows: Array<{ url: string; thumbnailUrl: string | null }>,
  extraRows?: Array<{ url: string | null }>,
): Set<string> {
  const ids = new Set<string>();
  for (const p of providerRows) {
    const cover = publicIdFromUrl(p.coverVideoUrl);
    if (cover) ids.add(cover);
    const avatar = publicIdFromUrl(p.avatarUrl);
    if (avatar) ids.add(avatar);
  }
  for (const item of portfolioRows) {
    const url = publicIdFromUrl(item.url);
    if (url) ids.add(url);
    const thumb = publicIdFromUrl(item.thumbnailUrl);
    if (thumb) ids.add(thumb);
  }
  if (extraRows) {
    for (const r of extraRows) {
      const pid = publicIdFromUrl(r.url);
      if (pid) ids.add(pid);
    }
  }
  return ids;
}

export function collectExtraPublicIds(
  blogRows: Array<{ heroImageUrl: string | null; content: unknown }>,
  teamRows: Array<{ avatarUrl: string | null }>,
): Array<{ url: string | null }> {
  const out: Array<{ url: string | null }> = [];
  for (const b of blogRows) {
    if (b.heroImageUrl) out.push({ url: b.heroImageUrl });
    // content may contain image blocks: EmailTemplateBlock[] with {type:"image", url}
    if (Array.isArray(b.content)) {
      for (const block of b.content as unknown[]) {
        if (block && typeof block === "object" && (block as Record<string, unknown>).type === "image") {
          const u = (block as Record<string, unknown>).url;
          if (typeof u === "string") out.push({ url: u });
        }
      }
    }
  }
  for (const t of teamRows) {
    if (t.avatarUrl) out.push({ url: t.avatarUrl });
  }
  return out;
}

/**
 * Pure helper: decide which assets are deletable (ACTIVE, older than the
 * threshold, and not referenced anywhere).
 */
export function resolveDeletableAssets(
  rows: MediaAssetRow[],
  referencedPublicIds: Set<string>,
  olderThan: Date,
): MediaAssetRow[] {
  return rows.filter(
    (row) =>
      row.status === "ACTIVE" &&
      row.createdAt.getTime() < olderThan.getTime() &&
      !referencedPublicIds.has(row.publicId),
  );
}

function mapAsset(row: MediaAssetRow): IMediaAsset {
  return {
    id: row.id,
    publicId: row.publicId,
    cloudName: row.cloudName,
    resourceType: row.resourceType as "video" | "image",
    url: row.url,
    thumbnailUrl: row.thumbnailUrl,
    mimeType: row.mimeType,
    ownerId: row.ownerId,
    status: row.status as "ACTIVE" | "DELETED",
    createdAt: row.createdAt.toISOString(),
  };
}

async function configCleanup(): Promise<{
  enabled: boolean;
  olderThanHours: number;
}> {
  let config;
  try {
    config = await PlatformConfigService.getCached();
  } catch {
    config = DEFAULT_CONFIG;
  }
  const media = config.mediaUpload ?? DEFAULT_CONFIG.mediaUpload!;
  return {
    enabled: Boolean(media.cleanupEnabled),
    olderThanHours: media.cleanupOrphanAfterHours ?? 0,
  };
}

export class MediaAssetService {
  static async recordUpload(data: {
    publicId: string;
    cloudName: string;
    resourceType: "video" | "image";
    url: string;
    thumbnailUrl: string | null;
    mimeType: string;
    ownerId: string | null;
  }): Promise<IMediaAsset> {
    const [row] = await db
      .insert(mediaAssets)
      .values({
        id: crypto.randomUUID(),
        publicId: data.publicId,
        cloudName: data.cloudName,
        resourceType: data.resourceType,
        url: data.url,
        thumbnailUrl: data.thumbnailUrl,
        mimeType: data.mimeType,
        ownerId: data.ownerId,
        status: "ACTIVE",
      })
      .returning();
    return mapAsset(row);
  }

  static async getById(id: string): Promise<IMediaAsset | null> {
    const rows = await db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.id, id))
      .limit(1);
    if (!rows.length) return null;
    return mapAsset(rows[0]);
  }

  static async listByOwner(ownerId: string): Promise<IMediaAsset[]> {
    const rows = await db
      .select()
      .from(mediaAssets)
      .where(
        and(eq(mediaAssets.ownerId, ownerId), eq(mediaAssets.status, "ACTIVE")),
      )
      .orderBy(desc(mediaAssets.createdAt));
    return rows.map(mapAsset);
  }

  static async listAll(): Promise<IMediaAsset[]> {
    const rows = await db
      .select({
        asset: mediaAssets,
        ownerName: user.name,
      })
      .from(mediaAssets)
      .leftJoin(user, eq(mediaAssets.ownerId, user.id))
      .where(eq(mediaAssets.status, "ACTIVE"))
      .orderBy(desc(mediaAssets.createdAt));

    const referenced = await MediaAssetService.loadReferencedPublicIds();

    return rows.map((row) => {
      const asset = mapAsset(row.asset);
      return {
        ...asset,
        ownerName: row.ownerName,
        referenced: referenced.has(asset.publicId),
      };
    });
  }

  /** Every Cloudinary public id currently referenced by profiles/portfolios + blog/team images. */
  static async loadReferencedPublicIds(): Promise<Set<string>> {
    const [providerRows, portfolioRows, blogRows, teamRows] = await Promise.all([
      db
        .select({
          coverVideoUrl: providers.coverVideoUrl,
          avatarUrl: providers.avatarUrl,
        })
        .from(providers)
        .where(
          or(
            isNotNull(providers.coverVideoUrl),
            isNotNull(providers.avatarUrl),
          ),
        ),
      db
        .select({ url: portfolioItems.url, thumbnailUrl: portfolioItems.thumbnailUrl })
        .from(portfolioItems),
      db
        .select({ heroImageUrl: blogPosts.heroImageUrl, content: blogPosts.content })
        .from(blogPosts)
        .then((rows) => rows as Array<{ heroImageUrl: string | null; content: unknown }>),
      db.select({ avatarUrl: teamMembers.avatarUrl }).from(teamMembers),
    ]);
    const extra = collectExtraPublicIds(
      blogRows as unknown as Array<{ heroImageUrl: string | null; content: unknown }>,
      teamRows as Array<{ avatarUrl: string | null }>,
    );
    return collectReferencedPublicIds(providerRows, portfolioRows, extra);
  }

  static async isReferenced(publicId: string): Promise<boolean> {
    const [providerHits, portfolioHits, blogHits, teamHits] = await Promise.all([
      db
        .select({ id: providers.id })
        .from(providers)
        .where(
          or(
            like(providers.coverVideoUrl, `%${publicId}%`),
            like(providers.avatarUrl, `%${publicId}%`),
          ),
        )
        .limit(1),
      db
        .select({ id: portfolioItems.id })
        .from(portfolioItems)
        .where(
          or(
            like(portfolioItems.url, `%${publicId}%`),
            like(portfolioItems.thumbnailUrl, `%${publicId}%`),
          ),
        )
        .limit(1),
      db
        .select({ id: blogPosts.id })
        .from(blogPosts)
        .where(like(blogPosts.heroImageUrl, `%${publicId}%`))
        .limit(1),
      db
        .select({ id: teamMembers.id })
        .from(teamMembers)
        .where(like(teamMembers.avatarUrl, `%${publicId}%`))
        .limit(1),
    ]);
    return providerHits.length > 0 || portfolioHits.length > 0 || blogHits.length > 0 || teamHits.length > 0;
  }

  /**
   * Clear DB references to a publicId: provider cover/avatar → null and any
   * portfolio items that reference it → removed. Returns the number of
   * references cleared.
   */
  static async clearReferences(publicId: string): Promise<number> {
    let cleared = 0;

    const providerUpdate = await db
      .update(providers)
      .set({ coverVideoUrl: null })
      .where(like(providers.coverVideoUrl, `%${publicId}%`))
      .returning({ id: providers.id });
    cleared += providerUpdate.length;

    const avatarUpdate = await db
      .update(providers)
      .set({ avatarUrl: null })
      .where(like(providers.avatarUrl, `%${publicId}%`))
      .returning({ id: providers.id });
    cleared += avatarUpdate.length;

    const portfolioDelete = await db
      .delete(portfolioItems)
      .where(
        or(
          like(portfolioItems.url, `%${publicId}%`),
          like(portfolioItems.thumbnailUrl, `%${publicId}%`),
        ),
      )
      .returning({ id: portfolioItems.id });
    cleared += portfolioDelete.length;

    return cleared;
  }

  /**
   * Reconcile an orphan asset by attaching it to a provider (portfolio item or avatar/cover).
   * Returns the created portfolio item id or updated provider id.
   */
  static async reconcileAsset(
    assetId: string,
    opts: { providerId: string; target: "portfolio" | "avatar" | "cover"; title?: string },
  ): Promise<{ reconciled: boolean; targetId: string }> {
    const asset = await MediaAssetService.getById(assetId);
    if (!asset) throw new Error("Media asset not found");
    const providerRows = await db.select().from(providers).where(eq(providers.id, opts.providerId)).limit(1);
    if (!providerRows.length) throw new Error("Provider not found");
    if (opts.target === "portfolio") {
      const [item] = await db
        .insert(portfolioItems)
        .values({
          id: crypto.randomUUID(),
          providerId: opts.providerId,
          source: "DIRECT",
          url: asset.url,
          thumbnailUrl: asset.thumbnailUrl,
          title: opts.title ?? asset.publicId,
          caption: null,
          driveFileId: null,
          mimeType: asset.mimeType ?? `${asset.resourceType}/unknown`,
          orderIndex: 0,
          visible: true,
        })
        .returning({ id: portfolioItems.id });
      return { reconciled: true, targetId: item.id };
    }
    if (opts.target === "avatar") {
      await db.update(providers).set({ avatarUrl: asset.url }).where(eq(providers.id, opts.providerId));
      return { reconciled: true, targetId: opts.providerId };
    }
    // cover
    await db.update(providers).set({ coverVideoUrl: asset.url }).where(eq(providers.id, opts.providerId));
    return { reconciled: true, targetId: opts.providerId };
  }

  /**
   * Delete a media asset: clears its DB references, removes the Cloudinary
   * binary (when admin credentials exist) and removes the registry row.
   */
  static async deleteAsset(id: string): Promise<DeleteAssetResult> {
    const asset = await MediaAssetService.getById(id);
    if (!asset) {
      throw new Error("Media asset not found");
    }

    let binaryDeleted = false;
    if (isCloudinaryAdminConfigured()) {
      await deleteAsset(asset.publicId, asset.resourceType, asset.cloudName);
      binaryDeleted = true;
    }

    const referencesCleared = await MediaAssetService.clearReferences(
      asset.publicId,
    );

    await db.delete(mediaAssets).where(eq(mediaAssets.id, id));

    return { deleted: true, referencesCleared, binaryDeleted };
  }

  /**
   * Replace an asset's binary: uploads a new file, swaps every DB reference to
   * the old publicId for the new one, then deletes the old binary.
   */
  static async replaceAsset(
    id: string,
    upload: {
      publicId: string;
      cloudName: string;
      resourceType: "video" | "image";
      url: string;
      thumbnailUrl: string | null;
      mimeType: string;
    },
  ): Promise<{ asset: IMediaAsset; referencesUpdated: number }> {
    const asset = await MediaAssetService.getById(id);
    if (!asset) {
      throw new Error("Media asset not found");
    }

    const [providerCover, providerAvatar, portfolioUrl] = await Promise.all([
      db
        .update(providers)
        .set({ coverVideoUrl: upload.url })
        .where(eq(providers.coverVideoUrl, asset.url))
        .returning({ id: providers.id }),
      db
        .update(providers)
        .set({ avatarUrl: upload.url })
        .where(eq(providers.avatarUrl, asset.url))
        .returning({ id: providers.id }),
      db
        .update(portfolioItems)
        .set({ url: upload.url })
        .where(eq(portfolioItems.url, asset.url))
        .returning({ id: portfolioItems.id }),
    ]);

    let referencesUpdated =
      providerCover.length + providerAvatar.length + portfolioUrl.length;

    if (asset.thumbnailUrl && upload.thumbnailUrl) {
      const portfolioThumb = await db
        .update(portfolioItems)
        .set({ thumbnailUrl: upload.thumbnailUrl })
        .where(eq(portfolioItems.thumbnailUrl, asset.thumbnailUrl))
        .returning({ id: portfolioItems.id });
      referencesUpdated += portfolioThumb.length;
    }

    const recorded = await MediaAssetService.recordUpload({
      publicId: upload.publicId,
      cloudName: upload.cloudName,
      resourceType: upload.resourceType,
      url: upload.url,
      thumbnailUrl: upload.thumbnailUrl,
      mimeType: upload.mimeType,
      ownerId: asset.ownerId,
    });

    await MediaAssetService.deleteAsset(id);

    return { asset: recorded, referencesUpdated };
  }

  /**
   * Orphan sweep: delete ACTIVE uploads older than the configured threshold
   * whose public id is no longer referenced by any profile or portfolio item.
   * Gated by mediaUpload.cleanupEnabled and mediaUpload.cleanupOrphanAfterHours.
   */
  static async cleanupOrphans(opts?: {
    olderThanHours?: number;
    dryRun?: boolean;
  }): Promise<CleanupResult> {
    const cleanup = await configCleanup();

    if (!cleanup.enabled) {
      return {
        enabled: false,
        thresholdHours: cleanup.olderThanHours,
        candidates: 0,
        deleted: 0,
        skippedBinary: 0,
        errors: [],
      };
    }

    const hours = opts?.olderThanHours ?? cleanup.olderThanHours;
    if (!hours || hours <= 0) {
      return {
        enabled: true,
        thresholdHours: hours,
        candidates: 0,
        deleted: 0,
        skippedBinary: 0,
        errors: [],
      };
    }

    const olderThan = new Date(Date.now() - hours * 60 * 60 * 1000);

    const rows = await db
      .select()
      .from(mediaAssets)
      .where(and(eq(mediaAssets.status, "ACTIVE"), lt(mediaAssets.createdAt, olderThan)));

    const referenced = await MediaAssetService.loadReferencedPublicIds();
    const deletable = resolveDeletableAssets(rows, referenced, olderThan);

    let deleted = 0;
    let skippedBinary = 0;
    const errors: string[] = [];

    for (const row of deletable) {
      if (opts?.dryRun) continue;
      try {
        if (isCloudinaryAdminConfigured()) {
          await deleteAsset(row.publicId, row.resourceType, row.cloudName);
        } else {
          skippedBinary++;
        }
        await db.delete(mediaAssets).where(eq(mediaAssets.id, row.id));
        deleted++;
      } catch (err) {
        errors.push(
          `Asset ${row.id} (${row.publicId}): ${
            err instanceof Error ? err.message : "Unknown error"
          }`,
        );
      }
    }

    return {
      enabled: true,
      thresholdHours: hours,
      candidates: deletable.length,
      deleted,
      skippedBinary,
      errors,
    };
  }
}
