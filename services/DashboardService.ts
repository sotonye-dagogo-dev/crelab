import { db } from "@/lib/db";
import {
  providers,
  bookings,
  portfolioItems,
  servicePackages,
  user,
  wallets,
  payments,
} from "@/drizzle/schema";
import { eq, and, sql, gte } from "drizzle-orm";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { MockDataService } from "@/services/MockDataService";
import { ExploreService } from "@/services/ExploreService";
import { formatKobo } from "@/lib/currency";
import type {
  IProviderDashboard,
  IClientDashboard,
  IDashboardBooking,
  IDashboardPipelineColumn,
  IDashboardStat,
  IDashboardAvailabilitySlot,
  IPortfolioPerformanceRow,
  IClientPaymentRecord,
  IProfileCompleteness,
  IBooking,
  IExploreCard,
} from "@/types";
import { BookingStatus } from "@/types";
import { ExploreSort } from "@/types";

interface DashboardBookingRow {
  booking: IBooking;
  providerName: string;
  clientName: string;
  packageLabel: string;
  packageTier: string;
}

export interface IDashboardService {
  getProviderDashboard(userId: string): Promise<IProviderDashboard>;
  getClientDashboard(userId: string): Promise<IClientDashboard>;
  getProviderPipeline(providerId: string): Promise<IDashboardPipelineColumn[]>;
  getClientPipeline(clientId: string): Promise<IDashboardPipelineColumn[]>;
  getAvailability(providerId: string): Promise<IDashboardAvailabilitySlot[]>;
}

export class DashboardService implements IDashboardService {
  static readonly PROVIDER_COLUMNS: { key: string; label: string; statuses: BookingStatus[] }[] = [
    { key: "requested", label: "Requested", statuses: [BookingStatus.REQUESTED, BookingStatus.ACCEPTED] },
    { key: "confirmed", label: "Confirmed", statuses: [BookingStatus.HELD] },
    { key: "in-progress", label: "In Progress", statuses: [BookingStatus.IN_PROGRESS] },
    { key: "completed", label: "Completed", statuses: [BookingStatus.RELEASED] },
  ];

  static readonly CLIENT_COLUMNS: { key: string; label: string; statuses: BookingStatus[] }[] = [
    { key: "pending", label: "Pending Acceptance", statuses: [BookingStatus.REQUESTED, BookingStatus.ACCEPTED] },
    { key: "confirmed", label: "Confirmed", statuses: [BookingStatus.HELD] },
    { key: "in-progress", label: "In Progress", statuses: [BookingStatus.IN_PROGRESS] },
    { key: "completed", label: "Completed", statuses: [BookingStatus.RELEASED, BookingStatus.REFUNDED] },
  ];

  /* ── Provider Dashboard ── */

  async getProviderDashboard(userId: string): Promise<IProviderDashboard> {
    try {
      const provider = await this.findProviderByUserId(userId);
      if (!provider) {
        throw new Error("Provider profile not found");
      }

      const platformConfig = await PlatformConfigService.get();
      const categoryLabel =
        platformConfig.categories.find((c) => c.slug === provider.categorySlug)?.label ??
        provider.categorySlug;

      const [bookingsRows, portfolioRows, pkgRows, walletRow, earningsRow] =
        await Promise.all([
          this.queryBookingsByProvider(provider.id),
          this.queryPortfolioByProvider(provider.id),
          this.countPackagesByProvider(provider.id),
          this.queryWallet(userId),
          this.queryEarnings30d(provider.id),
        ]);

      const completeness = this.computeCompleteness(
        provider,
        pkgRows,
        portfolioRows.length,
      );

      const pipeline = this.buildPipeline(
        bookingsRows.map((r) => this.toDashboardBooking(r)),
        DashboardService.PROVIDER_COLUMNS,
      );

      const escrowKobo = walletRow?.escrowKobo ?? 0;
      const totalEarnedKobo = walletRow?.totalEarnedKobo ?? 0;

      const stats: IDashboardStat[] = [
        {
          value: String(provider.profileViews),
          rawValue: provider.profileViews,
          label: "Profile Views",
          sub: this.percentageDelta("profileViews", provider.profileViews),
          subTone: "success",
        },
        {
          value: String(portfolioRows.reduce((acc, p) => acc + p.portfolioPlays, 0)),
          rawValue: portfolioRows.reduce((acc, p) => acc + p.portfolioPlays, 0),
          label: "Portfolio Plays",
        },
        {
          value: String(pipeline[0].bookings.length + pipeline[1].bookings.length),
          rawValue: pipeline[0].bookings.length + pipeline[1].bookings.length,
          label: "Booking Requests",
          sub: `${pipeline[0].bookings.length} pending`,
          subTone: "warning",
        },
        {
          value: formatKobo(earningsRow),
          rawValue: earningsRow,
          label: "Earnings (30d)",
          sub: `₦${((escrowKobo / 100).toLocaleString("en-NG"))} in escrow`,
          subTone: "held",
        },
      ];

      return {
        role: "PROVIDER",
        profile: {
          id: provider.id,
          userId: provider.userId,
          displayName: provider.displayName,
          categoryLabel,
          active: provider.active,
          verified: provider.verified,
          profileViews: provider.profileViews,
        },
        completeness,
        stats,
        pipeline,
        portfolioPerformance: this.buildPortfolioPerformance(portfolioRows),
        availability: await this.getAvailability(provider.id),
        quickActions: this.buildQuickActions(platformConfig),
      };
    } catch {
      if (MockDataService.isEnabled()) {
        return MockDataService.getMockProviderDashboard(userId);
      }
      return {
        role: "PROVIDER",
        profile: null,
        completeness: { percent: 0, completedItems: 0, totalItems: 0, items: [] },
        stats: [],
        pipeline: [],
        portfolioPerformance: [],
        availability: [],
        quickActions: [],
      };
    }
  }

  /* ── Client Dashboard ── */

  async getClientDashboard(userId: string): Promise<IClientDashboard> {
    try {
      const [bookingsRows, paymentRows, walletRow, exploreCards] =
        await Promise.all([
          this.queryBookingsByClient(userId),
          this.queryPaymentsByClient(userId),
          this.queryWallet(userId),
          this.queryExploreCards(),
        ]);

      const pipeline = this.buildPipeline(
        bookingsRows.map((r) => this.toDashboardBooking(r)),
        DashboardService.CLIENT_COLUMNS,
      );

      const paymentHistory: IClientPaymentRecord[] = paymentRows.map((r) => ({
        id: r.paymentId,
        bookingId: r.bookingId,
        providerId: r.providerId ?? "",
        providerName: r.providerName ?? "Unknown Provider",
        packageLabel: r.packageLabel ?? "Standard Package",
        amount: r.amount,
        fee: r.fee,
        netAmount: r.netAmount,
        status: r.status,
        paystackRef: r.paystackRef ?? "",
        createdAt: r.createdAt.toISOString(),
      }));

      const activeCount =
        pipeline
          .filter((c) => c.key !== "completed")
          .reduce((acc, c) => acc + c.bookings.length, 0);
      const inProgressCount =
        pipeline.find((c) => c.key === "in-progress")?.bookings.length ?? 0;

      const spent30dKobo = paymentHistory
        .filter((p) => new Date(p.createdAt).getTime() >= Date.now() - 30 * 86400000)
        .reduce((acc, p) => acc + p.amount, 0);

      const stats: IDashboardStat[] = [
        {
          value: String(activeCount),
          rawValue: activeCount,
          label: "Active Bookings",
          sub: `${inProgressCount} in progress`,
          subTone: "success",
        },
        {
          value: formatKobo(spent30dKobo),
          rawValue: spent30dKobo,
          label: "Total Spent (30d)",
          sub: `₦${((walletRow?.balanceKobo ?? 0) / 100).toLocaleString("en-NG")} wallet balance`,
          subTone: "tertiary",
        },
        {
          value: String(pipeline.reduce((acc, c) => acc + c.bookings.length, 0)),
          rawValue: pipeline.reduce((acc, c) => acc + c.bookings.length, 0),
          label: "Total Bookings",
          sub: `${pipeline.find((c) => c.key === "completed")?.bookings.length ?? 0} completed`,
          subTone: "accent",
        },
      ];

      return {
        role: "CLIENT",
        stats,
        pipeline,
        paymentHistory,
        discover: exploreCards,
      };
    } catch {
      if (MockDataService.isEnabled()) {
        return MockDataService.getMockClientDashboard(userId);
      }
      return {
        role: "CLIENT",
        stats: [],
        pipeline: [],
        paymentHistory: [],
        discover: [],
      };
    }
  }

  async getProviderPipeline(providerId: string): Promise<IDashboardPipelineColumn[]> {
    const rows = await this.queryBookingsByProvider(providerId);
    return this.buildPipeline(
      rows.map((r) => this.toDashboardBooking(r)),
      DashboardService.PROVIDER_COLUMNS,
    );
  }

  async getClientPipeline(clientId: string): Promise<IDashboardPipelineColumn[]> {
    const rows = await this.queryBookingsByClient(clientId);
    return this.buildPipeline(
      rows.map((r) => this.toDashboardBooking(r)),
      DashboardService.CLIENT_COLUMNS,
    );
  }

  async getAvailability(providerId: string): Promise<IDashboardAvailabilitySlot[]> {
    try {
      const platformConfig = await PlatformConfigService.get();
      const lookahead = platformConfig.dashboard?.availabilityLookaheadDays ?? 30;

      const rows = await db
        .select({ serviceDate: bookings.serviceDate, id: bookings.id })
        .from(bookings)
        .where(
          and(
            eq(bookings.providerId, providerId),
            sql`${bookings.status} IN (${BookingStatus.REQUESTED}, ${BookingStatus.ACCEPTED}, ${BookingStatus.HELD}, ${BookingStatus.IN_PROGRESS})`,
          ),
        );

      const booked = new Map<string, { bookingId: string; label: string }>();
      for (const row of rows) {
        if (!row.serviceDate) continue;
        const iso = new Date(row.serviceDate).toISOString().slice(0, 10);
        if (!booked.has(iso)) {
          booked.set(iso, { bookingId: row.id, label: "Booked" });
        }
      }

      const slots: IDashboardAvailabilitySlot[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 0; i < lookahead; i++) {
        const day = new Date(today);
        day.setDate(today.getDate() + i);
        const iso = day.toISOString().slice(0, 10);
        const existing = booked.get(iso);
        if (existing) {
          slots.push({
            date: iso,
            status: "BOOKED",
            bookingId: existing.bookingId,
            label: existing.label,
          });
        } else if (i === 0) {
          slots.push({ date: iso, status: "AVAILABLE", label: "Today" });
        } else {
          slots.push({ date: iso, status: "AVAILABLE" });
        }
      }

      return slots;
    } catch {
      if (MockDataService.isEnabled()) {
        return MockDataService.getMockAvailability(providerId);
      }
      return [];
    }
  }

  /* ── Query helpers ── */

  private async findProviderByUserId(userId: string) {
    const [row] = await db
      .select()
      .from(providers)
      .where(eq(providers.userId, userId));
    return row ?? null;
  }

  private async queryBookingsByProvider(providerId: string): Promise<DashboardBookingRow[]> {
    const rows = await db
      .select({
        booking: bookings,
        clientName: user.name,
        pkgLabel: servicePackages.label,
        pkgTier: servicePackages.tier,
      })
      .from(bookings)
      .leftJoin(user, eq(user.id, bookings.clientId))
      .leftJoin(servicePackages, eq(servicePackages.id, bookings.packageId))
      .where(eq(bookings.providerId, providerId))
      .orderBy(sql`${bookings.createdAt} DESC`);

    return rows.map((row) => ({
      booking: this.mapBooking(row.booking),
      providerName: "",
      clientName: row.clientName ?? "Client",
      packageLabel: row.pkgLabel ?? "Package",
      packageTier: row.pkgTier ?? "STANDARD",
    }));
  }

  private async queryBookingsByClient(clientId: string): Promise<DashboardBookingRow[]> {
    const rows = await db
      .select({
        booking: bookings,
        providerName: providers.displayName,
        pkgLabel: servicePackages.label,
        pkgTier: servicePackages.tier,
      })
      .from(bookings)
      .leftJoin(providers, eq(providers.id, bookings.providerId))
      .leftJoin(servicePackages, eq(servicePackages.id, bookings.packageId))
      .where(eq(bookings.clientId, clientId))
      .orderBy(sql`${bookings.createdAt} DESC`);

    return rows.map((row) => ({
      booking: this.mapBooking(row.booking),
      providerName: row.providerName ?? "Provider",
      clientName: "",
      packageLabel: row.pkgLabel ?? "Package",
      packageTier: row.pkgTier ?? "STANDARD",
    }));
  }

  private async queryPortfolioByProvider(providerId: string) {
    return db
      .select({
        id: portfolioItems.id,
        title: portfolioItems.title,
        mimeType: portfolioItems.mimeType,
        thumbnailUrl: portfolioItems.thumbnailUrl,
        visible: portfolioItems.visible,
        portfolioPlays: sql<number>`0`.as("portfolio_plays"),
        portfolioClicks: sql<number>`0`.as("portfolio_clicks"),
      })
      .from(portfolioItems)
      .where(eq(portfolioItems.providerId, providerId))
      .orderBy(sql`${portfolioItems.orderIndex} ASC`);
  }

  private async countPackagesByProvider(providerId: string): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`COUNT(*)`.as("count") })
      .from(servicePackages)
      .where(eq(servicePackages.providerId, providerId));
    return Number(row?.count ?? 0);
  }

  private async queryWallet(userId: string) {
    const [row] = await db.select().from(wallets).where(eq(wallets.userId, userId));
    return row ?? null;
  }

  private async queryEarnings30d(providerId: string): Promise<number> {
    const since = new Date(Date.now() - 30 * 86400000);
    const rows = await db
      .select({
        net: sql<number>`${bookings.total} - ${bookings.fee}`.as("net"),
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.providerId, providerId),
          eq(bookings.status, BookingStatus.RELEASED),
          gte(bookings.updatedAt, since),
        ),
      );
    return rows.reduce((acc, r) => acc + Number(r.net ?? 0), 0);
  }

  private async queryPaymentsByClient(clientId: string) {
    const since = new Date(Date.now() - 90 * 86400000);
    return db
      .select({
        paymentId: payments.id,
        bookingId: bookings.id,
        providerId: providers.id,
        providerName: providers.displayName,
        packageLabel: servicePackages.label,
        amount: payments.amount,
        fee: payments.fee,
        netAmount: payments.netAmount,
        status: bookings.status,
        paystackRef: payments.paystackRef,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .innerJoin(bookings, eq(bookings.id, payments.bookingId))
      .leftJoin(providers, eq(providers.id, bookings.providerId))
      .leftJoin(servicePackages, eq(servicePackages.id, bookings.packageId))
      .where(
        and(
          eq(bookings.clientId, clientId),
          gte(payments.createdAt, since),
        ),
      )
      .orderBy(sql`${payments.createdAt} DESC`)
      .limit(50);
  }

  private async queryExploreCards(): Promise<IExploreCard[]> {
    try {
      const result = await ExploreService.query({ limit: 4, sort: ExploreSort.NEWEST });
      return result.data;
    } catch {
      if (MockDataService.isEnabled()) {
        return MockDataService.getExploreProviders().slice(0, 4);
      }
      return [];
    }
  }

  /* ── Builders ── */

  private mapBooking(row: typeof bookings.$inferSelect): IBooking {
    return {
      id: row.id,
      providerId: row.providerId,
      clientId: row.clientId,
      packageId: row.packageId,
      status: row.status as BookingStatus,
      escrowState: row.escrowState as IBooking["escrowState"],
      subtotal: row.subtotal,
      fee: row.fee,
      total: row.total,
      serviceDate: row.serviceDate?.toISOString() ?? null,
      scopeNotes: row.scopeNotes,
      releaseDeadline: row.releaseDeadline?.toISOString() ?? null,
      paymentMode: (row.paymentMode ?? "ESCROW") as IBooking["paymentMode"],
      paystackRef: row.paystackRef,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toDashboardBooking(row: DashboardBookingRow): IDashboardBooking {
    return {
      id: row.booking.id,
      booking: row.booking,
      providerId: row.booking.providerId,
      providerName: row.providerName || "Provider",
      clientId: row.booking.clientId,
      clientName: row.clientName || "Client",
      packageId: row.booking.packageId,
      packageLabel: row.packageLabel,
      packageTier: row.packageTier,
    };
  }

  private buildPipeline(
    bookingsList: IDashboardBooking[],
    columns: { key: string; label: string; statuses: BookingStatus[] }[],
  ): IDashboardPipelineColumn[] {
    return columns.map((col) => ({
      ...col,
      bookings: bookingsList.filter((b) =>
        col.statuses.includes(b.booking.status),
      ),
    }));
  }

  private computeCompleteness(
    provider: typeof providers.$inferSelect,
    packageCount: number,
    portfolioCount: number,
  ): IProfileCompleteness {
    const categoryFields = (provider.categoryFields ?? {}) as Record<string, unknown>;

    const items: { key: string; label: string; completed: boolean }[] = [
      { key: "coverVideo", label: "Cover video", completed: !!provider.coverVideoUrl },
      { key: "bio", label: "Bio", completed: !!provider.bio },
      { key: "location", label: "Location", completed: !!provider.location },
      { key: "experience", label: "Experience level", completed: provider.yearsActive !== null && provider.yearsActive !== undefined },
      { key: "niche", label: "Niche tags", completed: Array.isArray(categoryFields.nicheTags) && (categoryFields.nicheTags as unknown[]).length > 0 },
      { key: "packages", label: "3 service packages", completed: packageCount >= 3 },
      { key: "portfolio", label: "3+ portfolio items", completed: portfolioCount >= 3 },
      { key: "drive", label: "Google Drive connected", completed: !!provider.driveFolderUrl },
      { key: "platforms", label: "Active platforms", completed: Array.isArray(categoryFields.activePlatforms) && (categoryFields.activePlatforms as unknown[]).length > 0 },
    ];

    const completedItems = items.filter((i) => i.completed).length;
    const percent = items.length === 0 ? 0 : Math.round((completedItems / items.length) * 100);

    return { percent, completedItems, totalItems: items.length, items };
  }

  private buildPortfolioPerformance(
    rows: {
      id: string;
      title: string | null;
      mimeType: string;
      thumbnailUrl: string | null;
      visible: boolean;
      portfolioPlays: number;
      portfolioClicks: number;
    }[],
  ): IPortfolioPerformanceRow[] {
    return rows.map((row) => {
      const plays = Number(row.portfolioPlays ?? 0);
      const clicks = Number(row.portfolioClicks ?? 0);
      const conversionRate =
        plays > 0 ? Math.round((clicks / plays) * 100) : 0;
      return {
        id: row.id,
        title: row.title ?? "Untitled",
        mimeType: row.mimeType,
        thumbnailUrl: row.thumbnailUrl,
        plays,
        clicks,
        conversionRate,
        visible: row.visible,
      };
    });
  }

  private buildQuickActions(platformConfig: Awaited<ReturnType<typeof PlatformConfigService.get>>) {
    const actions: IProviderDashboard["quickActions"] = [
      { label: "Add Portfolio Item", href: "/profile/media", variant: "primary" },
      { label: "Edit Packages", href: "/profile/setup", variant: "accent-outlined" },
      { label: "My Media", href: "/profile/media", variant: "accent-outlined" },
    ];
    if (platformConfig.features.googleDriveSync !== false) {
      actions.push({
        label: "Sync Google Drive",
        href: "/profile/media",
        variant: "ghost",
      });
    }
    return actions;
  }

  private percentageDelta(_key: string, _value: number): string | undefined {
    // Derived from historical aggregates when analytics exist. MVP shows a static hint.
    return "View full analytics";
  }
}
