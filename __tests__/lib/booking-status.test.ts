import { describe, it, expect } from "vitest";
import { BookingStatus } from "@/types";
import {
  ACTIVE_BOOKING_STATUSES,
  COMPLETED_BOOKING_STATUSES,
  CLOSED_BOOKING_STATUSES,
  TERMINAL_BOOKING_STATUSES,
  PAYABLE_BOOKING_STATUSES,
  BOOKING_STATUS_GROUPS,
  countByStatuses,
  groupBookingRows,
  paymentStageFor,
  mergePaymentHistory,
  bookingCardAffordance,
} from "@/lib/booking-status";
import type { IClientPaymentRecord } from "@/types";

const ALL_STATUSES = Object.values(BookingStatus);

describe("booking-status — status coverage", () => {
  it("dashboard-active + completed + closed cover every BookingStatus", () => {
    const covered = new Set<string>([
      ...ACTIVE_BOOKING_STATUSES,
      ...COMPLETED_BOOKING_STATUSES,
      ...CLOSED_BOOKING_STATUSES,
    ]);
    for (const status of ALL_STATUSES) {
      expect(covered.has(status), `missing status: ${status}`).toBe(true);
    }
  });

  it("no status is both active and terminal (except DISPUTED which is live)", () => {
    // HELD/IN_PROGRESS are live; DISPUTED is active but not terminal; the
    // terminal set must never overlap the active set.
    const active = new Set<string>(ACTIVE_BOOKING_STATUSES);
    for (const status of TERMINAL_BOOKING_STATUSES) {
      expect(active.has(status), `${status} can't be active AND terminal`).toBe(false);
    }
  });

  it("payable set matches the /pay gate (ACCEPTED only)", () => {
    expect(PAYABLE_BOOKING_STATUSES).toEqual([BookingStatus.ACCEPTED]);
  });

  it("page groups' union covers every BookingStatus exactly once", () => {
    const seen = new Map<string, number>();
    for (const group of BOOKING_STATUS_GROUPS) {
      for (const status of group.statuses) {
        seen.set(status, (seen.get(status) ?? 0) + 1);
      }
    }
    for (const status of ALL_STATUSES) {
      expect(seen.get(status), `group coverage for ${status}`).toBe(1);
    }
    expect(seen.size).toBe(ALL_STATUSES.length);
  });
});

describe("booking-status — countByStatuses", () => {
  it("counts only rows in the target set", () => {
    const rows = [
      { status: BookingStatus.REQUESTED },
      { status: BookingStatus.REQUESTED },
      { status: BookingStatus.HELD },
      { status: BookingStatus.CANCELLED },
    ];
    expect(countByStatuses(rows, [BookingStatus.REQUESTED])).toBe(2);
    expect(countByStatuses(rows, ACTIVE_BOOKING_STATUSES)).toBe(3);
    expect(countByStatuses(rows, [BookingStatus.RELEASED])).toBe(0);
  });

  it("unknown statuses never match", () => {
    expect(countByStatuses([{ status: "FUTURE_STATUS" }], ACTIVE_BOOKING_STATUSES)).toBe(0);
  });
});

describe("booking-status — groupBookingRows", () => {
  it("routes every row to a group and never drops any", () => {
    const rows = ALL_STATUSES.map((status) => ({ status }));
    const { groups, other } = groupBookingRows(rows);
    const grouped = groups.reduce((acc, g) => acc + g.bookings.length, 0);
    expect(grouped + other.length).toBe(rows.length);
    expect(other.length).toBe(0);
  });

  it("unknown statuses land in `other` instead of disappearing", () => {
    const { groups, other } = groupBookingRows([{ status: "FUTURE_STATUS" }]);
    expect(other).toHaveLength(1);
    expect(groups.every((g) => g.bookings.length === 0)).toBe(true);
  });
});

describe("booking-status — payment history", () => {
  const record = (overrides: Partial<IClientPaymentRecord>): IClientPaymentRecord => ({
    id: "r1",
    bookingId: "b1",
    providerId: "p1",
    providerName: "Provider",
    packageLabel: "Package",
    amount: 100000,
    fee: 5000,
    netAmount: 95000,
    status: "RELEASED",
    paystackRef: "ref",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  });

  it("paymentStageFor labels in-flight charges distinctly", () => {
    expect(paymentStageFor(BookingStatus.ACCEPTED)).toBe("Awaiting payment confirmation");
    expect(paymentStageFor(BookingStatus.CANCELLED)).toBe("Payment pending review");
    expect(paymentStageFor(BookingStatus.DECLINED)).toBe("Payment pending review");
    expect(paymentStageFor(BookingStatus.HELD)).toBe("Payment pending");
  });

  it("mergePaymentHistory de-dupes by id, sorts newest first, caps length", () => {
    const settled = [
      record({ id: "a", createdAt: "2026-01-01T00:00:00.000Z" }),
      record({ id: "b", createdAt: "2026-03-01T00:00:00.000Z" }),
    ];
    const initiated = [
      record({ id: "c", createdAt: "2026-02-01T00:00:00.000Z", stage: "Payment pending" }),
      record({ id: "a", createdAt: "2026-01-01T00:00:00.000Z" }), // dupe — first wins
    ];
    const merged = mergePaymentHistory(settled, initiated);
    expect(merged.map((r) => r.id)).toEqual(["b", "c", "a"]);
    expect(merged.find((r) => r.id === "c")?.stage).toBe("Payment pending");
  });

  it("mergePaymentHistory respects the limit", () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      record({ id: `r${i}`, createdAt: `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00.000Z` }),
    );
    expect(mergePaymentHistory(many, [], 3)).toHaveLength(3);
  });
});

describe("booking-status — card affordances (OD-8 / OD-11)", () => {
  it("client ACCEPTED prompts Pay Now; REQUESTED says awaiting", () => {
    expect(bookingCardAffordance(BookingStatus.ACCEPTED, "client")).toEqual({
      label: "Pay Now →",
      kind: "link",
    });
    expect(bookingCardAffordance(BookingStatus.REQUESTED, "client")).toEqual({
      label: "Awaiting response",
      kind: "text",
    });
  });

  it("provider REQUESTED prompts Review; HELD prompts Start Work", () => {
    expect(bookingCardAffordance(BookingStatus.REQUESTED, "provider")).toEqual({
      label: "Review →",
      kind: "link",
    });
    expect(bookingCardAffordance(BookingStatus.HELD, "provider")).toEqual({
      label: "Start Work →",
      kind: "link",
    });
    expect(bookingCardAffordance(BookingStatus.ACCEPTED, "provider")).toEqual({
      label: "Awaiting payment",
      kind: "text",
    });
  });

  it("every status gets a non-empty affordance on both sides", () => {
    for (const status of ALL_STATUSES) {
      for (const side of ["client", "provider"] as const) {
        const a = bookingCardAffordance(status, side);
        expect(a.label.length).toBeGreaterThan(0);
        expect(["link", "text"]).toContain(a.kind);
      }
    }
  });
});
