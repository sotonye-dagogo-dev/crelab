import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { providers, portfolioItems, servicePackages, reviews, bookings } from "@/drizzle/schema";
import { eq, and, sql, desc, asc, like } from "drizzle-orm";
import { buildProviderSlug } from "@/lib/slug";
import { fixLegacyVideoThumbnailUrl, generateVideoThumbnail } from "@/lib/cloudinary";
import type { IPortfolioItem } from "@/types";

const explorePortfolioQuerySchema = z.object({
  category: z.string().optional(),
  location: z.string().optional(),
  budgetMin: z.coerce.number().int().optional(),
  budgetMax: z.coerce.number().int().optional(),
  q: z.string().optional(),
  sort: z.enum(["NEWEST", "TOP_RATED", "MOST_BOOKED", "FEATURED"]).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

interface PortfolioGalleryItem extends IPortfolioItem {
  providerId: string;
  providerName: string;
  providerSlug: string;
  providerAvatarUrl: string | null;
  providerCategorySlug: string;
  providerCategoryLabel: string;
  providerLocation: string | null;
  providerVerified: boolean;
  providerFeatured: boolean;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawParams: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      rawParams[key] = value;
    });

    const parsed = explorePortfolioQuerySchema.safeParse(rawParams);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          data: [],
          cursor: null,
          hasMore: false,
          error: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const limit = parsed.data.limit ?? 24;
    const take = limit + 1;

    // Mock fallback mirrors GET /api/explore: when mock data is enabled the
    // providers view serves mock providers, so the content view must serve the
    // matching mock portfolio items — otherwise providers appear to have
    // content while the gallery is impossibly empty.
    const { MockDataService } = await import("@/services/MockDataService");
    if (MockDataService.isEnabled()) {
      const cards = MockDataService.getExploreProviders();
      const data: PortfolioGalleryItem[] = [];
      for (const card of cards) {
        for (const item of MockDataService.getMockPortfolioItems(card.id)) {
          data.push({
            ...item,
            providerId: card.id,
            providerName: card.displayName,
            providerSlug: card.slug,
            providerAvatarUrl: card.avatarUrl,
            providerCategorySlug: card.categorySlug,
            providerCategoryLabel: card.categoryLabel,
            providerLocation: card.location,
            providerVerified: card.verified,
            providerFeatured: card.featured,
          });
        }
      }
      return NextResponse.json({
        success: true,
        data: data.slice(0, limit),
        cursor: null,
        hasMore: false,
        error: null,
      });
    }

    const conditions: ReturnType<typeof sql>[] = [
      sql`${portfolioItems.visible} = true`,
      sql`${providers.active} = true`,
    ];

    if (parsed.data.category) {
      conditions.push(sql`${providers.categorySlug} = ${parsed.data.category}`);
    }

    if (parsed.data.location) {
      conditions.push(sql`${providers.location} ILIKE ${`%${parsed.data.location}%`}`);
    }

    if (parsed.data.q) {
      conditions.push(
        sql`(${portfolioItems.title} ILIKE ${`%${parsed.data.q}%`} OR ${providers.displayName} ILIKE ${`%${parsed.data.q}%`})`,
      );
    }

    const sort = parsed.data.sort ?? "NEWEST";

    const orderClauses = (() => {
      switch (sort) {
        case "TOP_RATED":
          return [
            desc(sql`COALESCE(r.avg_rating, 0)`),
            desc(portfolioItems.createdAt),
            desc(portfolioItems.id),
          ];
        case "MOST_BOOKED":
          return [
            desc(sql`COALESCE(b.booking_count, 0)`),
            desc(portfolioItems.createdAt),
            desc(portfolioItems.id),
          ];
        case "FEATURED":
          return [
            desc(providers.featured),
            desc(portfolioItems.createdAt),
            desc(portfolioItems.id),
          ];
        case "NEWEST":
        default:
          return [desc(portfolioItems.createdAt), desc(portfolioItems.id)];
      }
    })();

    if (parsed.data.cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(parsed.data.cursor, "base64url").toString("utf8"));
        if (decoded) {
          conditions.push(
            sql`(${portfolioItems.createdAt}, ${portfolioItems.id}) < (${decoded.v}::timestamp with time zone, ${decoded.id})`,
          );
        }
      } catch {
        // Invalid cursor, ignore
      }
    }

    const query = db
      .select({
        // Portfolio item fields
        itemId: portfolioItems.id,
        itemProviderId: portfolioItems.providerId,
        itemSource: portfolioItems.source,
        itemUrl: portfolioItems.url,
        itemThumbnailUrl: portfolioItems.thumbnailUrl,
        itemTitle: portfolioItems.title,
        itemCaption: portfolioItems.caption,
        itemDriveFileId: portfolioItems.driveFileId,
        itemMimeType: portfolioItems.mimeType,
        itemOrderIndex: portfolioItems.orderIndex,
        itemVisible: portfolioItems.visible,
        itemCreatedAt: portfolioItems.createdAt,
        itemUpdatedAt: portfolioItems.updatedAt,
        // Provider fields
        providerId: providers.id,
        providerDisplayName: providers.displayName,
        providerCategorySlug: providers.categorySlug,
        providerLocation: providers.location,
        providerAvatarUrl: providers.avatarUrl,
        providerVerified: providers.verified,
        providerFeatured: providers.featured,
        // Aggregates
        avgRating: sql<number>`COALESCE((
          SELECT AVG(r2.rating)::numeric(3,2) FROM ${reviews} r2
          WHERE r2.provider_id = ${providers.id}
        ), 0)`.as("avg_rating"),
        reviewCount: sql<number>`(
          SELECT COUNT(*) FROM ${reviews} r3
          WHERE r3.provider_id = ${providers.id}
        )`.as("review_count"),
        bookingCount: sql<number>`(
          SELECT COUNT(*) FROM ${bookings} b2
          WHERE b2.provider_id = ${providers.id}
            AND b2.status = 'RELEASED'
        )`.as("booking_count"),
      })
      .from(portfolioItems)
      .innerJoin(providers, eq(portfolioItems.providerId, providers.id))
      .where(and(...conditions))
      .orderBy(...orderClauses)
      .limit(take);

    const rows = await query;
    const hasMore = rows.length > limit;
    const slice = rows.slice(0, limit);

    const raw: PortfolioGalleryItem[] = slice.map((row) => ({
      id: row.itemId,
      providerId: row.itemProviderId,
      source: row.itemSource as IPortfolioItem["source"],
      url: row.itemUrl,
      thumbnailUrl: fixLegacyVideoThumbnailUrl(row.itemThumbnailUrl),
      title: row.itemTitle,
      caption: row.itemCaption,
      driveFileId: row.itemDriveFileId,
      mimeType: row.itemMimeType,
      orderIndex: row.itemOrderIndex,
      visible: row.itemVisible,
      createdAt: row.itemCreatedAt.toISOString(),
      updatedAt: row.itemUpdatedAt.toISOString(),
      providerName: row.providerDisplayName,
      providerSlug: buildProviderSlug(row.providerDisplayName, row.providerId),
      providerAvatarUrl: row.providerAvatarUrl,
      providerCategorySlug: row.providerCategorySlug,
      providerCategoryLabel: row.providerCategorySlug === "content-creator" ? "Content Creator" : "Cinematographer / Videographer",
      providerLocation: row.providerLocation,
      providerVerified: row.providerVerified,
      providerFeatured: row.providerFeatured,
    }));
    // Deduplicate same asset appearing multiple times (same url or same driveFileId)
    const seenUrls = new Set<string>();
    const seenDrive = new Set<string>();
    const data: PortfolioGalleryItem[] = [];
    for (const it of raw) {
      if (it.driveFileId && seenDrive.has(it.driveFileId)) continue;
      if (it.driveFileId) seenDrive.add(it.driveFileId);
      const norm = it.url.trim().toLowerCase();
      if (seenUrls.has(norm)) continue;
      seenUrls.add(norm);
      data.push(it);
    }

    // Cover fallback (first page only): a cover (video OR photo) must surface
    // as gallery content even when no portfolio row exists yet — otherwise the
    // providers view cycles content while this view is impossibly empty. The
    // display picture (avatar) is never synthesized. Covers already present as
    // items (or already seen above) are skipped; synthetic ids are stable
    // (`cover-<providerId>`) so they never duplicate real rows.
    if (!parsed.data.cursor && data.length < limit) {
      try {
        const { withCoverFallback, isImageCoverUrl } = await import("@/lib/portfolio");
        const coverConditions: ReturnType<typeof sql>[] = [
          sql`${providers.active} = true`,
          sql`${providers.coverVideoUrl} IS NOT NULL`,
        ];
        if (parsed.data.category) {
          coverConditions.push(sql`${providers.categorySlug} = ${parsed.data.category}`);
        }
        if (parsed.data.location) {
          coverConditions.push(sql`${providers.location} ILIKE ${`%${parsed.data.location}%`}`);
        }
        if (parsed.data.q) {
          coverConditions.push(
            sql`${providers.displayName} ILIKE ${`%${parsed.data.q}%`}`,
          );
        }
        const coverRows = await db
          .select({
            providerId: providers.id,
            providerDisplayName: providers.displayName,
            providerCategorySlug: providers.categorySlug,
            providerLocation: providers.location,
            providerAvatarUrl: providers.avatarUrl,
            providerVerified: providers.verified,
            providerFeatured: providers.featured,
            coverUrl: providers.coverVideoUrl,
            providerCreatedAt: providers.createdAt,
          })
          .from(providers)
          .where(and(...coverConditions))
          .orderBy(desc(providers.createdAt))
          .limit(100);
        for (const cov of coverRows) {
          if (data.length >= limit) break;
          const coverUrl = cov.coverUrl;
          if (!coverUrl || !coverUrl.trim()) continue;
          if (seenUrls.has(coverUrl.trim().toLowerCase())) continue;
          const merged = withCoverFallback(
            [],
            cov.providerId,
            coverUrl,
            isImageCoverUrl(coverUrl)
              ? fixLegacyVideoThumbnailUrl(coverUrl)
              : (() => {
                  try {
                    return fixLegacyVideoThumbnailUrl(generateVideoThumbnail(coverUrl));
                  } catch {
                    return null;
                  }
                })(),
          );
          const synth = merged[0];
          if (!synth) continue;
          seenUrls.add(synth.url.trim().toLowerCase());
          data.push({
            ...synth,
            providerId: cov.providerId,
            providerName: cov.providerDisplayName,
            providerSlug: buildProviderSlug(cov.providerDisplayName, cov.providerId),
            providerAvatarUrl: cov.providerAvatarUrl,
            providerCategorySlug: cov.providerCategorySlug,
            providerCategoryLabel: cov.providerCategorySlug === "content-creator" ? "Content Creator" : "Cinematographer / Videographer",
            providerLocation: cov.providerLocation,
            providerVerified: cov.providerVerified,
            providerFeatured: cov.providerFeatured,
          });
        }
      } catch {
        // Cover fill is best-effort — real portfolio rows already collected win.
      }
    }

    const nextCursor = hasMore
      ? Buffer.from(
          JSON.stringify({
            v: slice[slice.length - 1].itemCreatedAt.toISOString(),
            id: slice[slice.length - 1].itemId,
          }),
        ).toString("base64url")
      : null;

    return NextResponse.json({
      success: true,
      data,
      cursor: nextCursor,
      hasMore,
      error: null,
    });
  } catch (err) {
    console.error("[GET /api/explore/portfolio] error", err);
    return NextResponse.json(
      {
        success: false,
        data: [],
        cursor: null,
        hasMore: false,
        error: "An unexpected error occurred",
      },
      { status: 500 },
    );
  }
}