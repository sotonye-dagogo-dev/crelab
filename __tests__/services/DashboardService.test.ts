import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DashboardService } from "@/services/DashboardService";
import { BookingStatus } from "@/types";

describe("DashboardService — Pipeline Column Definitions", () => {
  it("provider pipeline has Requested, Confirmed, In Progress, Completed columns", () => {
    const keys = DashboardService.PROVIDER_COLUMNS.map((c) => c.key);
    expect(keys).toEqual(["requested", "confirmed", "in-progress", "completed"]);
  });

  it("every provider column status is a valid BookingStatus", () => {
    const allStates = new Set(Object.values(BookingStatus));
    for (const col of DashboardService.PROVIDER_COLUMNS) {
      for (const s of col.statuses) {
        expect(allStates.has(s)).toBe(true);
      }
    }
  });

  it("provider completed column only holds RELEASED", () => {
    const completed = DashboardService.PROVIDER_COLUMNS.find((c) => c.key === "completed")!;
    expect(completed.statuses).toEqual([BookingStatus.RELEASED]);
  });

  it("client pipeline has Pending Acceptance, Confirmed, In Progress, Completed", () => {
    const keys = DashboardService.CLIENT_COLUMNS.map((c) => c.key);
    expect(keys).toEqual(["pending", "confirmed", "in-progress", "completed"]);
  });

  it("client completed column holds RELEASED and REFUNDED", () => {
    const completed = DashboardService.CLIENT_COLUMNS.find((c) => c.key === "completed")!;
    expect(completed.statuses).toContain(BookingStatus.RELEASED);
    expect(completed.statuses).toContain(BookingStatus.REFUNDED);
  });

  it("client columns cover all active pipeline statuses", () => {
    const covered = new Set(
      DashboardService.CLIENT_COLUMNS.flatMap((c) => c.statuses),
    );
    for (const s of [
      BookingStatus.REQUESTED,
      BookingStatus.ACCEPTED,
      BookingStatus.HELD,
      BookingStatus.IN_PROGRESS,
      BookingStatus.RELEASED,
      BookingStatus.REFUNDED,
    ]) {
      expect(covered.has(s)).toBe(true);
    }
  });
});

describe("DashboardService — Mock Fallback Data", () => {
  const ORIGINAL_ENV = process.env.NEXT_PUBLIC_MOCK_DATA;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_MOCK_DATA = "true";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_MOCK_DATA = ORIGINAL_ENV;
  });

  it("provider dashboard shape is complete", async () => {
    const { MockDataService } = await import("@/services/MockDataService");
    const data = MockDataService.getMockProviderDashboard("mock-user-1");

    expect(data.role).toBe("PROVIDER");
    expect(data.profile).not.toBeNull();
    expect(data.profile!.displayName).toBe("Amara Studios");
    expect(data.stats.length).toBeGreaterThanOrEqual(4);
    expect(data.pipeline.length).toBe(4);
    expect(data.portfolioPerformance.length).toBeGreaterThan(0);
    expect(data.availability.length).toBeGreaterThan(0);
    expect(data.quickActions.length).toBeGreaterThan(0);
    expect(data.completeness.percent).toBeGreaterThanOrEqual(0);
    expect(data.completeness.percent).toBeLessThanOrEqual(100);
    expect(data.completeness.completedItems).toBeLessThanOrEqual(
      data.completeness.totalItems,
    );
  });

  it("provider completeness percent is consistent with completed items", async () => {
    const { MockDataService } = await import("@/services/MockDataService");
    const data = MockDataService.getMockProviderDashboard("mock-user-1");
    const expected = Math.round(
      (data.completeness.completedItems / data.completeness.totalItems) * 100,
    );
    expect(data.completeness.percent).toBe(expected);
  });

  it("provider pipeline bookings reference real mock bookings", async () => {
    const { MockDataService } = await import("@/services/MockDataService");
    const data = MockDataService.getMockProviderDashboard("mock-user-1");
    const allIds = data.pipeline.flatMap((c) => c.bookings.map((b) => b.booking.id));
    const knownIds = new Set(MockDataService.getMockBookings().map((b) => b.id));
    for (const id of allIds) {
      expect(knownIds.has(id)).toBe(true);
    }
  });

  it("provider stats formatting uses kobo integers", async () => {
    const { MockDataService } = await import("@/services/MockDataService");
    const data = MockDataService.getMockProviderDashboard("mock-user-1");
    const earnings = data.stats.find((s) => s.label === "Earnings (30d)");
    expect(earnings).toBeDefined();
    expect(Number.isInteger(earnings!.rawValue)).toBe(true);
    expect(earnings!.value).toMatch(/^₦/);
  });

  it("client dashboard shape is complete", async () => {
    const { MockDataService } = await import("@/services/MockDataService");
    const data = MockDataService.getMockClientDashboard("mock-client-1");

    expect(data.role).toBe("CLIENT");
    expect(data.stats.length).toBeGreaterThanOrEqual(3);
    expect(data.pipeline.length).toBe(4);
    expect(data.paymentHistory.length).toBeGreaterThan(0);
    expect(data.discover.length).toBeGreaterThan(0);
  });

  it("client payment history amounts are integers in kobo", async () => {
    const { MockDataService } = await import("@/services/MockDataService");
    const data = MockDataService.getMockClientDashboard("mock-client-1");
    for (const p of data.paymentHistory) {
      expect(Number.isInteger(p.amount)).toBe(true);
      expect(Number.isInteger(p.fee)).toBe(true);
      expect(Number.isInteger(p.netAmount)).toBe(true);
      expect(p.netAmount).toBe(p.amount - p.fee);
    }
  });

  it("client payment history is sorted newest first", async () => {
    const { MockDataService } = await import("@/services/MockDataService");
    const data = MockDataService.getMockClientDashboard("mock-client-1");
    const dates = data.paymentHistory.map((p) => new Date(p.createdAt).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i]).toBeLessThanOrEqual(dates[i - 1]);
    }
  });

  it("mock dashboard methods return empty-safe shapes when disabled", async () => {
    process.env.NEXT_PUBLIC_MOCK_DATA = "false";
    const { MockDataService } = await import("@/services/MockDataService");
    const provider = MockDataService.getMockProviderDashboard("mock-user-1");
    const client = MockDataService.getMockClientDashboard("mock-client-1");

    expect(provider.profile).toBeNull();
    expect(provider.stats).toEqual([]);
    expect(provider.pipeline).toEqual([]);
    expect(client.stats).toEqual([]);
    expect(client.pipeline).toEqual([]);
    expect(client.paymentHistory).toEqual([]);
    expect(client.discover).toEqual([]);
  });

  it("mock availability covers the lookahead window with only valid statuses", async () => {
    const { MockDataService } = await import("@/services/MockDataService");
    const slots = MockDataService.getMockAvailability("mock-provider-1");
    expect(slots.length).toBeGreaterThan(0);
    const valid = new Set(["AVAILABLE", "BOOKED", "PAST"]);
    for (const slot of slots) {
      expect(valid.has(slot.status)).toBe(true);
      expect(slot.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("mock portfolio performance rows are consistent", async () => {
    const { MockDataService } = await import("@/services/MockDataService");
    const rows = MockDataService.getMockPortfolioPerformance("mock-provider-1");
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(Number.isInteger(row.plays)).toBe(true);
      expect(Number.isInteger(row.clicks)).toBe(true);
      expect(row.conversionRate).toBeGreaterThanOrEqual(0);
      expect(row.conversionRate).toBeLessThanOrEqual(100);
    }
  });
});
