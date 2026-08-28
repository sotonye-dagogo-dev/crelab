import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { providers, portfolioItems, servicePackages, reviews, bookings } from "@/drizzle/schema";
import { eq, and, sql, desc, asc, like } from "drizzle-orm";
import { buildProviderSlug } from "@/lib/slug";
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

    const data: PortfolioGalleryItem[] = slice.map((row) => ({
      id: row.itemId,
      providerId: row.itemProviderId,
      source: row.itemSource as IPortfolioItem["source"],
      url: row.itemUrl,
      thumbnailUrl: row.itemThumbnailUrl,
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