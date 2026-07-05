import { db } from "@/lib/db";
import { providers, servicePackages, portfolioItems, reviews, bookings } from "@/drizzle/schema";
import { eq, and, sql, desc, asc } from "drizzle-orm";
import type { IExploreCard, IExploreFilters } from "@/types";

const DEFAULT_LIMIT = 20;

interface CursorPayload {
  v: string | number;
  id: string;
}

function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodeCursor(cursor: string): CursorPayload | null {
  try {
    return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export class ExploreService {
  static async query(filters: IExploreFilters) {
    const limit = filters.limit ?? DEFAULT_LIMIT;
    const take = limit + 1;

    const conditions: ReturnType<typeof sql>[] = [sql`${providers.active} = true`];

    if (filters.category) {
      conditions.push(sql`${providers.categorySlug} = ${filters.category}`);
    }

    if (filters.location) {
      conditions.push(sql`${providers.location} ILIKE ${`%${filters.location}%`}`);
    }

    if (filters.budgetMin !== undefined) {
      conditions.push(sql`EXISTS (
        SELECT 1 FROM ${servicePackages} sp_sub
        WHERE sp_sub.provider_id = ${providers.id}
        AND sp_sub.price >= ${filters.budgetMin}
      )`);
    }

    if (filters.budgetMax !== undefined) {
      conditions.push(sql`EXISTS (
        SELECT 1 FROM ${servicePackages} sp_sub
        WHERE sp_sub.provider_id = ${providers.id}
        AND sp_sub.price <= ${filters.budgetMax}
      )`);
    }

    if (filters.q) {
      conditions.push(
        sql`search_vector @@ plainto_tsquery('english', ${filters.q})`,
      );
    }

    const sort = filters.sort ?? "NEWEST";

    const orderClauses = (() => {
      switch (sort) {
        case "TOP_RATED":
          return [
            desc(sql`COALESCE(r.avg_rating, 0)`),
            desc(providers.createdAt),
            desc(providers.id),
          ];
        case "MOST_BOOKED":
          return [
            desc(sql`COALESCE(b.booking_count, 0)`),
            desc(providers.createdAt),
            desc(providers.id),
          ];
        case "FEATURED":
          return [
            desc(providers.featured),
            desc(providers.createdAt),
            desc(providers.id),
          ];
        case "NEWEST":
        default:
          return [desc(providers.createdAt), desc(providers.id)];
      }
    })();

    const selectFields = {
      id: providers.id,
      displayName: providers.displayName,
      categorySlug: providers.categorySlug,
      location: providers.location,
      avatarUrl: providers.avatarUrl,
      featured: providers.featured,
      verified: providers.verified,
      yearsActive: providers.yearsActive,
      experienceLevel: providers.experienceLevel,
      createdAt: providers.createdAt,
      previewVideoUrl: sql<string>`(
        SELECT pi.url FROM ${portfolioItems} pi
        WHERE pi.provider_id = ${providers.id}
          AND pi.visible = true
          AND pi.mime_type LIKE 'video/%'
        ORDER BY pi.order_index ASC
        LIMIT 1
      )`.as("preview_video_url"),
      packagePriceFromKobo: sql<number>`(
        SELECT MIN(sp2.price) FROM ${servicePackages} sp2
        WHERE sp2.provider_id = ${providers.id}
      )`.as("package_price_from_kobo"),
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
    };

    if (filters.cursor) {
      const decoded = decodeCursor(filters.cursor);
      if (decoded) {
        conditions.push(
          sql`(${providers.createdAt}, ${providers.id}) < (${decoded.v}::timestamp with time zone, ${decoded.id})`,
        );
      }
    }

    const query = db
      .select(selectFields)
      .from(providers)
      .where(and(...conditions))
      .orderBy(...orderClauses)
      .limit(take);

    const rows = await query;
    const hasMore = rows.length > limit;
    const slice = rows.slice(0, limit);

    const data: IExploreCard[] = slice.map((row) => ({
      id: row.id,
      displayName: row.displayName,
      slug: `${row.displayName.toLowerCase().replace(/\s+/g, "-")}-${row.id.slice(0, 8)}`,
      categorySlug: row.categorySlug,
      categoryLabel: "",
      location: row.location,
      avatarUrl: row.avatarUrl,
      previewVideoUrl: row.previewVideoUrl ?? null,
      packagePriceFromKobo: row.packagePriceFromKobo ?? null,
      rating: row.avgRating,
      reviewCount: row.reviewCount ?? 0,
      featured: row.featured,
      verified: row.verified,
      yearsActive: row.yearsActive,
      experienceLevel: row.experienceLevel,
    }));

    const nextCursor = hasMore
      ? encodeCursor({
          v: slice[slice.length - 1].createdAt.toISOString(),
          id: slice[slice.length - 1].id,
        })
      : null;

    return { data, cursor: nextCursor, hasMore };
  }

  static async getCategoryStats(categorySlug: string) {
    const row = await db
      .select({
        activeCount: sql<number>`COUNT(DISTINCT ${providers.id})`.as("active_count"),
        avgRating: sql<number>`COALESCE(AVG(r.rating)::numeric(3,2), 0)`.as("avg_rating"),
        minPrice: sql<number>`COALESCE(MIN(sp.price), 0)`.as("min_price"),
      })
      .from(providers)
      .leftJoin(reviews, eq(providers.id, reviews.providerId))
      .leftJoin(servicePackages, eq(providers.id, servicePackages.providerId))
      .where(
        and(
          eq(providers.active, true),
          eq(providers.categorySlug, categorySlug),
        ),
      )
      .then((rows) => rows[0]);

    return {
      activeCount: Number(row?.activeCount ?? 0),
      avgRating: Number(row?.avgRating ?? 0),
      minPrice: Number(row?.minPrice ?? 0),
    };
  }
}
