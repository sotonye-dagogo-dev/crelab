import { BookingStatus } from "@/types";
import type { IClientPaymentRecord } from "@/types";

/**
 * Pure booking-status helpers shared by the dashboards, the bookings list and
 * the booking detail action matrix. Keeping the groupings here (instead of
 * inline in pages/components) means one source of truth can be unit-tested for
 * *full status coverage* — the failure mode where a booking exists in the DB
 * but no surface renders it.
 */

/** Still live — anything a human may need to act on. Counts as "active". */
export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.REQUESTED,
  BookingStatus.ACCEPTED,
  BookingStatus.HELD,
  BookingStatus.IN_PROGRESS,
  BookingStatus.DISPUTED,
];

/** Money settled (paid out or returned). */
export const COMPLETED_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.RELEASED,
  BookingStatus.REFUNDED,
];

/** Closed without money moving to the provider. */
export const CLOSED_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.DECLINED,
  BookingStatus.CANCELLED,
];

/** Terminal states — no further transition is legal. */
export const TERMINAL_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.DECLINED,
  BookingStatus.CANCELLED,
  BookingStatus.RELEASED,
  BookingStatus.REFUNDED,
];

/** Bookings a client can still pay for (matches the /pay gate exactly). */
export const PAYABLE_BOOKING_STATUSES: BookingStatus[] = [BookingStatus.ACCEPTED];

export function isActiveBookingStatus(status: string): boolean {
  return ACTIVE_BOOKING_STATUSES.includes(status as BookingStatus);
}

export function isTerminalBookingStatus(status: string): boolean {
  return TERMINAL_BOOKING_STATUSES.includes(status as BookingStatus);
}

/** Count rows whose status is in `targets` (unknown statuses never match). */
export function countByStatuses<T extends { status: string }>(
  rows: T[],
  targets: BookingStatus[],
): number {
  const set = new Set<string>(targets);
  return rows.reduce((acc, row) => (set.has(row.status) ? acc + 1 : acc), 0);
}

/* ── Bookings list grouping ── */

export interface IBookingStatusGroup {
  key: string;
  label: string;
  statuses: BookingStatus[];
}

/**
 * `/bookings` page sections. The group union MUST cover every BookingStatus —
 * `__tests__/lib/booking-status.test.ts` enforces it so no booking can silently
 * fall off the page.
 */
export const BOOKING_STATUS_GROUPS: IBookingStatusGroup[] = [
  { key: "active", label: "Active", statuses: [BookingStatus.HELD, BookingStatus.IN_PROGRESS, BookingStatus.DISPUTED] },
  { key: "requested", label: "Requests", statuses: [BookingStatus.REQUESTED, BookingStatus.ACCEPTED] },
  { key: "completed", label: "Completed", statuses: [BookingStatus.RELEASED, BookingStatus.REFUNDED] },
  { key: "cancelled", label: "Cancelled", statuses: [BookingStatus.DECLINED, BookingStatus.CANCELLED] },
];

export interface IGroupedBookings<T> {
  key: string;
  label: string;
  bookings: T[];
}

/**
 * Bucket rows into the page's sections. Rows whose status matches no group
 * (schema drift, a future status) are NOT dropped — they land in an `other`
 * bucket the caller can render. "No invisible bookings" is the invariant.
 */
export function groupBookingRows<T extends { status: string }>(
  rows: T[],
): { groups: IGroupedBookings<T>[]; other: T[] } {
  const groups: IGroupedBookings<T>[] = BOOKING_STATUS_GROUPS.map((g) => ({
    key: g.key,
    label: g.label,
    bookings: [] as T[],
  }));
  const other: T[] = [];

  for (const row of rows) {
    const index = BOOKING_STATUS_GROUPS.findIndex((g) =>
      (g.statuses as string[]).includes(row.status),
    );
    if (index === -1) other.push(row);
    else groups[index].bookings.push(row);
  }

  return { groups, other };
}

/* ── Dashboard payment history ── */

/**
 * Stage label for a booking that started a charge (Paystack ref stored) but has
 * no `payments` row yet — the money is in flight or needs review, so it must be
 * visible on the client dashboard instead of disappearing between "initiated"
 * and "held".
 */
export function paymentStageFor(status: string): string {
  switch (status) {
    case BookingStatus.ACCEPTED:
      return "Awaiting payment confirmation";
    case BookingStatus.CANCELLED:
    case BookingStatus.DECLINED:
      return "Payment pending review";
    default:
      return "Payment pending";
  }
}

/**
 * Merge settled payment rows with charge-initiated bookings into one history
 * feed: de-duplicated by id (a booking can never appear twice), newest first,
 * capped at `limit`. Derived rows keep `stage` so the UI can distinguish them
 * from money that actually settled — and so "Total Spent" style stats can
 * exclude them.
 */
export function mergePaymentHistory(
  settled: IClientPaymentRecord[],
  initiated: IClientPaymentRecord[],
  limit = 50,
): IClientPaymentRecord[] {
  const byId = new Map<string, IClientPaymentRecord>();
  for (const record of [...settled, ...initiated]) {
    if (!record?.id || byId.has(record.id)) continue;
    byId.set(record.id, record);
  }

  return [...byId.values()]
    .sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime() || 0;
      const bTime = new Date(b.createdAt).getTime() || 0;
      return bTime - aTime;
    })
    .slice(0, Math.max(0, limit));
}

/* ── Kanban card affordances ── */

export interface IBookingAffordance {
  /** What the card's bottom-right corner tells the viewer they can do. */
  label: string;
  /** `link` — the whole card navigates to the action surface; `text` — passive state note. */
  kind: "link" | "text";
}

/**
 * Per-state card affordance per the OD-8 (provider) / OD-11 (client) design
 * specs. Cards stay a single `<Link>` (no nested interactives) — the label
 * routes the viewer to `/bookings/[id]`, where the real action buttons live.
 */
export function bookingCardAffordance(
  status: string,
  side: "client" | "provider",
): IBookingAffordance {
  if (side === "client") {
    switch (status) {
      case BookingStatus.REQUESTED:
        return { label: "Awaiting response", kind: "text" };
      case BookingStatus.ACCEPTED:
        return { label: "Pay Now →", kind: "link" };
      case BookingStatus.IN_PROGRESS:
        return { label: "Review & Release →", kind: "link" };
      case BookingStatus.DISPUTED:
        return { label: "Dispute in review →", kind: "link" };
      case BookingStatus.DECLINED:
      case BookingStatus.CANCELLED:
        return { label: "View →", kind: "link" };
      default:
        return { label: "View →", kind: "link" };
    }
  }

  switch (status) {
    case BookingStatus.REQUESTED:
      return { label: "Review →", kind: "link" };
    case BookingStatus.ACCEPTED:
      return { label: "Awaiting payment", kind: "text" };
    case BookingStatus.HELD:
      return { label: "Start Work →", kind: "link" };
    case BookingStatus.IN_PROGRESS:
      return { label: "Deliver →", kind: "link" };
    default:
      return { label: "View →", kind: "link" };
  }
}
