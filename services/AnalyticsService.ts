import { db } from "@/lib/db";
import {
  bookings,
  payments,
  providers,
  reviews,
  user,
  disputes,
  portfolioItems,
  referralEvents,
  webinarRegistrations,
  webinars,
} from "@/drizzle/schema";
import { and, desc, gte, lt, sql } from "drizzle-orm";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { DEFAULT_CONFIG } from "@/config/platform.config";
import {
  buildDayAxis,
  buildInsights,
  fillSeries,
  movingAverage,
  pctChange,
  type IDayPoint,
  type IInsight,
} from "@/lib/analytics";

export interface IAnalyticsKpi {
  key: string;
  label: string;
  /** Display value (formatted) */
  value: string;
  rawValue: number;
  /** Fractional change vs previous window; null when no basis */
  delta: number | null;
  /** Higher-is-better hint for tone */
  goodWhenUp: boolean;
}

export interface IAnalyticsBreakdown {
  key: string;
  label: string;
  value: number;
}

export interface ITopProvider {
  providerId: string;
  displayName: string;
  categorySlug: string;
  bookings: number;
  /** Money in kobo */
  gmvKobo: number;
  avgRating: number | null;
}

export interface IAnalyticsOverview {
  rangeDays: number;
  from: string;
  to: string;
  kpis: IAnalyticsKpi[];
  series: {
    bookingsPerDay: IDayPoint[];
    bookingsTrend: IDayPoint[];
    gmvPerDayKobo: IDayPoint[];
    gmvTrendKobo: IDayPoint[];
    signupsPerDay: IDayPoint[];
    revenuePerDayKobo: IDayPoint[];
  };
  breakdowns: {
    bookingsByStatus: IAnalyticsBreakdown[];
    revenueByCategoryKobo: IAnalyticsBreakdown[];
    usersByRole: IAnalyticsBreakdown[];
  };
  topProviders: ITopProvider[];
  platform: Record<string, number>;
  insights: IInsight[];
  totals: {
    bookings: number;
    bookingsPrev: number;
    gmvKobo: number;
    gmvPrevKobo: number;
    signups: number;
    signupsPrev: number;
  };
}

const naira = (kobo: number): string => `₦${Math.round(kobo / 100).toLocaleString("en-NG")}`;

export class AnalyticsService {
  async getOverview(rangeDays: number): Promise<IAnalyticsOverview> {
    const range = [7, 30, 90, 365].includes(rangeDays) ? rangeDays : 30;
    const now = new Date();
    const from = new Date(now.getTime() - range * 86400000);
    const prevFrom = new Date(now.getTime() - range * 2 * 86400000);
    const axis = buildDayAxis(from, now);

    const config = await PlatformConfigService.get().catch(() => DEFAULT_CONFIG);
    const analyticsCfg = config.analytics ?? DEFAULT_CONFIG.analytics!;

    // ── Windowed aggregates (bounded group-bys; no full-table scans into memory) ──
    const [cur, prev] = await Promise.all([this.windowStats(from, now), this.windowStats(prevFrom, from)]);

    const [userStats, lifetime] = await Promise.all([this.userStats(from, prevFrom), this.lifetimeStats()]);

    const [statusRows, categoryRows, roleRows, topRows, platform] = await Promise.all([
      this.bookingsByStatus(from),
      this.revenueByCategory(from),
      this.usersByRole(),
      this.topProviders(5),
      this.extendedCounts(),
    ]);

    // ── Daily series ──
    const [bookingDays, gmvDays, signupDays, revenueDays] = await Promise.all([
      this.dailyCounts(bookings.createdAt, bookings.id, from, "count"),
      this.dailySums(bookings.createdAt, bookings.total, from),
      this.dailyCounts(user.createdAt, user.id, from, "count"),
      this.dailySums(bookings.createdAt, bookings.fee, from),
    ]);

    const bookingsPerDay = fillSeries(axis, bookingDays);
    const gmvPerDayKobo = fillSeries(axis, gmvDays);
    const signupsPerDay = fillSeries(axis, signupDays);
    const revenuePerDayKobo = fillSeries(axis, revenueDays);

    const releaseRate =
      cur.decided > 0 ? cur.released / cur.decided : null;
    const disputeRate = cur.bookings > 0 ? cur.disputed / cur.bookings : null;

    const kpis: IAnalyticsKpi[] = [
      {
        key: "bookings",
        label: `Bookings (${range}d)`,
        value: String(cur.bookings),
        rawValue: cur.bookings,
        delta: pctChange(cur.bookings, prev.bookings),
        goodWhenUp: true,
      },
      {
        key: "gmv",
        label: `GMV (${range}d)`,
        value: naira(cur.gmvKobo),
        rawValue: cur.gmvKobo,
        delta: pctChange(cur.gmvKobo, prev.gmvKobo),
        goodWhenUp: true,
      },
      {
        key: "revenue",
        label: `Platform fees (${range}d)`,
        value: naira(cur.feeKobo),
        rawValue: cur.feeKobo,
        delta: pctChange(cur.feeKobo, prev.feeKobo),
        goodWhenUp: true,
      },
      {
        key: "signups",
        label: `New members (${range}d)`,
        value: String(userStats.signups),
        rawValue: userStats.signups,
        delta: pctChange(userStats.signups, userStats.signupsPrev),
        goodWhenUp: true,
      },
      {
        key: "providers",
        label: "Active providers",
        value: String(lifetime.activeProviders),
        rawValue: lifetime.activeProviders,
        delta: null,
        goodWhenUp: true,
      },
      {
        key: "conversion",
        label: "Booking conversion",
        value: cur.bookings > 0 || userStats.signups > 0 ? `${(((cur.bookings || 0) / Math.max(1, userStats.signups)) * 100).toFixed(1)}%` : "n/a",
        rawValue: userStats.signups > 0 ? cur.bookings / userStats.signups : 0,
        delta: null,
        goodWhenUp: true,
      },
      {
        key: "avgRating",
        label: "Avg rating (lifetime)",
        value: lifetime.avgRating !== null ? lifetime.avgRating.toFixed(1) : "n/a",
        rawValue: lifetime.avgRating ?? 0,
        delta: null,
        goodWhenUp: true,
      },
      {
        key: "disputes",
        label: `Disputes (${range}d)`,
        value: String(cur.disputed),
        rawValue: cur.disputed,
        delta: pctChange(cur.disputed, prev.disputed),
        goodWhenUp: false,
      },
    ];

    const insights = buildInsights({
      rangeDays: range,
      bookings: cur.bookings,
      bookingsPrev: prev.bookings,
      gmvKobo: cur.gmvKobo,
      gmvPrevKobo: prev.gmvKobo,
      signups: userStats.signups,
      signupsPrev: userStats.signupsPrev,
      releaseRate,
      disputeRate,
      minBookings: analyticsCfg.insightMinBookings,
      surgeThreshold: analyticsCfg.insightSurgeThreshold,
    });

    return {
      rangeDays: range,
      from: from.toISOString(),
      to: now.toISOString(),
      kpis,
      series: {
        bookingsPerDay,
        bookingsTrend: movingAverage(bookingsPerDay, 7),
        gmvPerDayKobo,
        gmvTrendKobo: movingAverage(gmvPerDayKobo, 7),
        signupsPerDay,
        revenuePerDayKobo,
      },
      breakdowns: {
        bookingsByStatus: statusRows,
        revenueByCategoryKobo: categoryRows,
        usersByRole: roleRows,
      },
      topProviders: topRows,
      platform,
      insights,
      totals: {
        bookings: cur.bookings,
        bookingsPrev: prev.bookings,
        gmvKobo: cur.gmvKobo,
        gmvPrevKobo: prev.gmvKobo,
        signups: userStats.signups,
        signupsPrev: userStats.signupsPrev,
      },
    };
  }

  /* ── Query helpers (all bounded aggregates) ── */

  private async windowStats(from: Date, to: Date): Promise<{
    bookings: number;
    gmvKobo: number;
    feeKobo: number;
    released: number;
    decided: number;
    disputed: number;
  }> {
    const [row] = await db
      .select({
        bookings: sql<number>`COUNT(*)`.as("bookings"),
        gmv: sql<number>`COALESCE(SUM(${bookings.total}), 0)`.as("gmv"),
        fees: sql<number>`COALESCE(SUM(${bookings.fee}), 0)`.as("fees"),
        released: sql<number>`COUNT(*) FILTER (WHERE ${bookings.status} = 'RELEASED')`.as("released"),
        decided: sql<number>`COUNT(*) FILTER (WHERE ${bookings.status} IN ('RELEASED', 'REFUNDED'))`.as("decided"),
        disputed: sql<number>`COUNT(*) FILTER (WHERE ${bookings.status} = 'DISPUTED')`.as("disputed"),
      })
      .from(bookings)
      .where(and(gte(bookings.createdAt, from), lt(bookings.createdAt, to)));
    return {
      bookings: Number(row?.bookings ?? 0),
      gmvKobo: Number(row?.gmv ?? 0),
      feeKobo: Number(row?.fees ?? 0),
      released: Number(row?.released ?? 0),
      decided: Number(row?.decided ?? 0),
      disputed: Number(row?.disputed ?? 0),
    };
  }

  private async userStats(from: Date, prevFrom: Date): Promise<{ signups: number; signupsPrev: number }> {
    const [cur] = await db
      .select({ count: sql<number>`COUNT(*)`.as("count") })
      .from(user)
      .where(gte(user.createdAt, from));
    const [prev] = await db
      .select({ count: sql<number>`COUNT(*)`.as("count") })
      .from(user)
      .where(and(gte(user.createdAt, prevFrom), lt(user.createdAt, from)));
    return { signups: Number(cur?.count ?? 0), signupsPrev: Number(prev?.count ?? 0) };
  }

  private async lifetimeStats(): Promise<{ activeProviders: number; avgRating: number | null }> {
    const [p] = await db
      .select({ count: sql<number>`COUNT(*) FILTER (WHERE ${providers.active} = true)`.as("count") })
      .from(providers);
    const [r] = await db
      .select({ avg: sql<number | null>`AVG(${reviews.rating})`.as("avg") })
      .from(reviews);
    return {
      activeProviders: Number(p?.count ?? 0),
      avgRating: r?.avg !== null && r?.avg !== undefined ? Number(r.avg) : null,
    };
  }

  private async bookingsByStatus(from: Date): Promise<IAnalyticsBreakdown[]> {
    const rows = await db
      .select({ status: bookings.status, count: sql<number>`COUNT(*)`.as("count") })
      .from(bookings)
      .where(gte(bookings.createdAt, from))
      .groupBy(bookings.status);
    return rows.map((r) => ({ key: r.status, label: r.status, value: Number(r.count ?? 0) }));
  }

  private async revenueByCategory(from: Date): Promise<IAnalyticsBreakdown[]> {
    const rows = await db
      .select({
        category: providers.categorySlug,
        revenue: sql<number>`COALESCE(SUM(${bookings.total}), 0)`.as("revenue"),
      })
      .from(bookings)
      .innerJoin(providers, sql`${providers.id} = ${bookings.providerId}`)
      .where(gte(bookings.createdAt, from))
      .groupBy(providers.categorySlug)
      .orderBy(desc(sql`COALESCE(SUM(${bookings.total}), 0)`))
      .limit(10);
    return rows.map((r) => ({
      key: r.category ?? "unknown",
      label: r.category ?? "Unknown",
      value: Number(r.revenue ?? 0),
    }));
  }

  private async usersByRole(): Promise<IAnalyticsBreakdown[]> {
    const rows = await db
      .select({ role: user.role, count: sql<number>`COUNT(*)`.as("count") })
      .from(user)
      .groupBy(user.role);
    return rows.map((r) => ({ key: r.role, label: r.role, value: Number(r.count ?? 0) }));
  }

  private async topProviders(limit: number): Promise<ITopProvider[]> {
    const rows = await db
      .select({
        providerId: bookings.providerId,
        displayName: providers.displayName,
        categorySlug: providers.categorySlug,
        bookings: sql<number>`COUNT(*)`.as("bookings"),
        gmv: sql<number>`COALESCE(SUM(${bookings.total}), 0)`.as("gmv"),
      })
      .from(bookings)
      .innerJoin(providers, sql`${providers.id} = ${bookings.providerId}`)
      .groupBy(bookings.providerId, providers.displayName, providers.categorySlug)
      .orderBy(desc(sql`COALESCE(SUM(${bookings.total}), 0)`))
      .limit(limit);
    const out: ITopProvider[] = [];
    for (const r of rows) {
      const [rating] = await db
        .select({ avg: sql<number | null>`AVG(${reviews.rating})`.as("avg") })
        .from(reviews)
        .where(sql`${reviews.providerId} = ${r.providerId}`);
      out.push({
        providerId: r.providerId,
        displayName: r.displayName ?? "Provider",
        categorySlug: r.categorySlug ?? "",
        bookings: Number(r.bookings ?? 0),
        gmvKobo: Number(r.gmv ?? 0),
        avgRating: rating?.avg !== null && rating?.avg !== undefined ? Number(rating.avg) : null,
      });
    }
    return out;
  }

  private async dailyCounts(
    col: typeof bookings.createdAt | typeof user.createdAt,
    idCol: unknown,
    from: Date,
    _mode: "count",
  ): Promise<Map<string, number>> {
    const table = col === user.createdAt ? user : bookings;
    void idCol;
    const rows = await db
      .select({
        day: sql<string>`to_char(${col}, 'YYYY-MM-DD')`.as("day"),
        count: sql<number>`COUNT(*)`.as("count"),
      })
      .from(table)
      .where(gte(col, from))
      .groupBy(sql`to_char(${col}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${col}, 'YYYY-MM-DD')`);
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.day, Number(r.count ?? 0));
    return map;
  }

  private async dailySums(
    col: typeof bookings.createdAt,
    sumCol: typeof bookings.total | typeof bookings.fee,
    from: Date,
  ): Promise<Map<string, number>> {
    const rows = await db
      .select({
        day: sql<string>`to_char(${col}, 'YYYY-MM-DD')`.as("day"),
        sum: sql<number>`COALESCE(SUM(${sumCol}), 0)`.as("sum"),
      })
      .from(bookings)
      .where(gte(col, from))
      .groupBy(sql`to_char(${col}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${col}, 'YYYY-MM-DD')`);
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.day, Number(r.sum ?? 0));
    return map;
  }

  /* ── Lifetime platform-wide counters (single bounded aggregates) ── */
  async extendedCounts(): Promise<Record<string, number>> {
    const [[pay], [disp], [port], [ref], [web], [reg]] = await Promise.all([
      db.select({ count: sql<number>`COUNT(*)`.as("count") }).from(payments),
      db.select({ count: sql<number>`COUNT(*)`.as("count") }).from(disputes),
      db.select({ count: sql<number>`COUNT(*) FILTER (WHERE ${portfolioItems.visible} = true)`.as("count") }).from(portfolioItems),
      db.select({ count: sql<number>`COUNT(*)`.as("count") }).from(referralEvents),
      db.select({ count: sql<number>`COUNT(*) FILTER (WHERE ${webinars.active} = true)`.as("count") }).from(webinars),
      db.select({ count: sql<number>`COUNT(*)`.as("count") }).from(webinarRegistrations),
    ]);
    return {
      payments: Number(pay?.count ?? 0),
      disputes: Number(disp?.count ?? 0),
      visiblePortfolioItems: Number(port?.count ?? 0),
      referralEvents: Number(ref?.count ?? 0),
      activeWebinars: Number(web?.count ?? 0),
      webinarRegistrations: Number(reg?.count ?? 0),
    };
  }
}
