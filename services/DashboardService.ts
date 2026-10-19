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
  IProviderPaymentRecord,
  IProfileCompleteness,
  IBooking,
  IExploreCard,
} from "@/types";
import { BookingStatus } from "@/types";
import { ExploreSort } from "@/types";
import {
  ACTIVE_BOOKING_STATUSES,
  countByStatuses,
  mergePaymentHistory,
  paymentStageFor,
} from "@/lib/booking-status";

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
    // Attention + closed states — previously dropped, so those bookings were
    // invisible to the provider even though the DB row existed.
    { key: "attention", label: "Needs Attention", statuses: [BookingStatus.DISPUTED] },
    { key: "refunded", label: "Refunded", statuses: [BookingStatus.REFUNDED] },
    { key: "cancelled", label: "Cancelled", statuses: [BookingStatus.DECLINED, BookingStatus.CANCELLED] },
  ];

  static readonly CLIENT_COLUMNS: { key: string; label: string; statuses: BookingStatus[] }[] = [
    { key: "pending", label: "Pending Acceptance", statuses: [BookingStatus.REQUESTED, BookingStatus.ACCEPTED] },
    { key: "confirmed", label: "Confirmed", statuses: [BookingStatus.HELD] },
    { key: "in-progress", label: "In Progress", statuses: [BookingStatus.IN_PROGRESS] },
    { key: "completed", label: "Completed", statuses: [BookingStatus.RELEASED, BookingStatus.REFUNDED] },
    { key: "attention", label: "Needs Attention", statuses: [BookingStatus.DISPUTED] },
    { key: "cancelled", label: "Cancelled", statuses: [BookingStatus.DECLINED, BookingStatus.CANCELLED] },
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

      const [bookingsRows, portfolioRows, pkgRows, walletRow, earningsRow, providerPaymentRows] =
        await Promise.all([
          this.queryBookingsByProvider(provider.id),
          this.queryPortfolioByProvider(provider.id),
          this.countPackagesByProvider(provider.id),
          this.queryWallet(userId),
          this.queryEarnings30d(provider.id),
          this.queryPaymentsByProvider(provider.id),
        ]);

      const paymentHistory: IProviderPaymentRecord[] = providerPaymentRows.map((r) => ({
        id: r.paymentId,
        bookingId: r.bookingId,
        clientId: r.clientId ?? "",
        clientName: r.clientName ?? "Unknown Client",
        packageLabel: r.packageLabel ?? "Standard Package",
        amount: Number(r.amount),
        fee: Number(r.fee),
        netAmount: Number(r.netAmount),
        status: r.status,
        paystackRef: r.paystackRef ?? "",
        createdAt: r.createdAt.toISOString(),
      }));

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

      // Derived from the booking ROWS (not column indexes) so reordering or
      // adding kanban columns can never skew the headline numbers.
      const bookingStatusRows = bookingsRows.map((r) => r.booking);
      const requestedCount = countByStatuses(bookingStatusRows, [BookingStatus.REQUESTED]);
      const acceptedCount = countByStatuses(bookingStatusRows, [BookingStatus.ACCEPTED]);

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
          value: String(requestedCount + acceptedCount),
          rawValue: requestedCount + acceptedCount,
          label: "Booking Requests",
          sub: `${requestedCount} awaiting review`,
          subTone: "warning",
        },
        {
          value: formatKobo(earningsRow),
          rawValue: earningsRow,
          label: "Earnings (30d)",
          sub: `₦${((escrowKobo / 100).toLocaleString("en-NG"))} in escrow`,
          subTone: "held",
          hintKey: "dashboardEscrow",
        },
      ];

      const portfolioGallery = portfolioRows.map((r) => ({
        id: r.id,
        title: r.title,
        url: r.url,
        thumbnailUrl: r.thumbnailUrl,
        mimeType: r.mimeType,
        source: r.source as string,
        visible: r.visible,
        orderIndex: r.orderIndex,
      }));

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
        paymentHistory,
        portfolioPerformance: this.buildPortfolioPerformance(portfolioRows),
        portfolioGallery,
        availability: await this.getAvailability(provider.id),
        quickActions: this.buildQuickActions(platformConfig),
      };
    } catch (err) {
      // Never swallow: a silent catch turns a real failure into an empty
      // dashboard and hides the bug from operators.
      console.error("[DashboardService] getProviderDashboard failed:", err);
      if (MockDataService.isEnabled()) {
        return MockDataService.getMockProviderDashboard(userId);
      }
      return {
        role: "PROVIDER",
        profile: null,
        completeness: { percent: 0, completedItems: 0, totalItems: 0, items: [] },
        stats: [],
        pipeline: [],
        paymentHistory: [],
        portfolioPerformance: [],
        portfolioGallery: [],
        availability: [],
        quickActions: [],
      };
    }
  }

  /* ── Client Dashboard ── */

  async getClientDashboard(userId: string): Promise<IClientDashboard> {
    try {
      const platformConfig = await PlatformConfigService.get();
      const historyWindowDays = platformConfig.dashboard?.paymentHistoryDays ?? 0;

      const [bookingsRows, paymentRows, walletRow, exploreCards] =
        await Promise.all([
          this.queryBookingsByClient(userId),
          this.queryPaymentsByClient(userId, historyWindowDays),
          this.queryWallet(userId),
          this.queryExploreCards(),
        ]);

      const pipeline = this.buildPipeline(
        bookingsRows.map((r) => this.toDashboardBooking(r)),
        DashboardService.CLIENT_COLUMNS,
      );

      const settled: IClientPaymentRecord[] = paymentRows.map((r) => ({
        id: r.paymentId,
        bookingId: r.bookingId,
        providerId: r.providerId ?? "",
        providerName: r.providerName ?? "Unknown Provider",
        packageLabel: r.packageLabel ?? "Standard Package",
        amount: Number(r.amount),
        fee: Number(r.fee),
        netAmount: Number(r.netAmount),
        status: r.status,
        paystackRef: r.paystackRef ?? "",
        createdAt: r.createdAt.toISOString(),
      }));

      // Bookings that started a charge (Paystack ref stored) but never got a
      // `payments` row — the money is in flight or needs review. They used to
      // vanish entirely from the history; now they show with a stage label.
      const settledBookingIds = new Set(settled.map((p) => p.bookingId));
      const initiated: IClientPaymentRecord[] = bookingsRows
        .filter(
          (r) => r.booking.paystackRef && !settledBookingIds.has(r.booking.id),
        )
        .map((r) => ({
          id: `charge:${r.booking.id}`,
          bookingId: r.booking.id,
          providerId: r.booking.providerId,
          providerName: r.providerName || "Unknown Provider",
          packageLabel: r.packageLabel || "Standard Package",
          amount: Number(r.booking.total),
          fee: Number(r.booking.fee),
          netAmount: Number(r.booking.total) - Number(r.booking.fee),
          status: r.booking.status,
          paystackRef: r.booking.paystackRef ?? "",
          createdAt: r.booking.createdAt,
          stage: paymentStageFor(r.booking.status),
        }));

      const paymentHistory = mergePaymentHistory(settled, initiated, 50);

      const bookingStatusRows = bookingsRows.map((r) => r.booking);
      const activeCount = countByStatuses(bookingStatusRows, ACTIVE_BOOKING_STATUSES);
      const inProgressCount = countByStatuses(bookingStatusRows, [
        BookingStatus.IN_PROGRESS,
      ]);

      // "Total Spent" must count money that actually settled — never derived
      // in-flight rows, which can be cancelled or refunded later.
      const spent30dKobo = settled
        .filter((p) => new Date(p.createdAt).getTime() >= Date.now() - 30 * 86400000)
        .reduce((acc, p) => acc + Number(p.amount), 0);

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
          value: String(bookingStatusRows.length),
          rawValue: bookingStatusRows.length,
          label: "Total Bookings",
          sub: `${countByStatuses(bookingStatusRows, [BookingStatus.RELEASED])} completed`,
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
    } catch (err) {
      // Never swallow — an empty dashboard must not hide a real failure.
      console.error("[DashboardService] getClientDashboard failed:", err);
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
    } catch (err) {
      console.error("[DashboardService] getAvailability failed:", err);
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
        url: portfolioItems.url,
        source: portfolioItems.source,
        orderIndex: portfolioItems.orderIndex,
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

  /**
   * Settled payment rows for a client. `windowDays` comes from config
   * (`dashboard.paymentHistoryDays`); 0 = no age cutoff — history is capped by
   * row count only, so an older payment can't silently disappear.
   */
  private async queryPaymentsByClient(clientId: string, windowDays = 0) {
    const conditions = [eq(bookings.clientId, clientId)];
    if (windowDays > 0) {
      conditions.push(
        gte(payments.createdAt, new Date(Date.now() - windowDays * 86400000)),
      );
    }
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
      .where(and(...conditions))
      .orderBy(sql`${payments.createdAt} DESC`)
      .limit(50);
  }

  /**
   * Settled payment rows for a provider (mirror of the client query) — gives
   * providers booking-level visibility of money held/released for their work,
   * not just the wallet ledger.
   */
  private async queryPaymentsByProvider(providerId: string) {
    return db
      .select({
        paymentId: payments.id,
        bookingId: bookings.id,
        clientId: user.id,
        clientName: user.name,
        packageLabel: servicePackages.label,
        amount: payments.amount,
        fee: payments.fee,
        netAmount: payments.netAmount,
        status: payments.status,
        paystackRef: payments.paystackRef,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .innerJoin(bookings, eq(bookings.id, payments.bookingId))
      .leftJoin(user, eq(user.id, bookings.clientId))
      .leftJoin(servicePackages, eq(servicePackages.id, bookings.packageId))
      .where(eq(bookings.providerId, providerId))
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
