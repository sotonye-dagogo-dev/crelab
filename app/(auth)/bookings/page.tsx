import { db } from "@/lib/db";
import { bookings, payments, providers, servicePackages, user } from "@/drizzle/schema";
import { eq, desc, sql, type SQL } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { BookingsListClient } from "./BookingsListClient";
import { MockDataService } from "@/services/MockDataService";
import type { IBooking, IPayment } from "@/types";

export const dynamic = "force-dynamic";

const statusGroups = [
  { key: "active", label: "Active", statuses: ["HELD", "IN_PROGRESS", "DISPUTED"] },
  { key: "requested", label: "Requests", statuses: ["REQUESTED", "ACCEPTED"] },
  { key: "completed", label: "Completed", statuses: ["RELEASED", "REFUNDED"] },
  { key: "cancelled", label: "Cancelled", statuses: ["DECLINED", "CANCELLED"] },
];

const providerNames: Record<string, string> = {
  "mock-provider-1": "Amara Studios",
  "mock-provider-2": "Lens & Light",
  "mock-provider-3": "Kelechi Media",
};

async function getSessionUser() {
  try {
    const session = await requireAuth();
    return { user: session.user, isMock: false };
  } catch {
    if (MockDataService.isEnabled()) {
      const mock = MockDataService.getMockSession();
      return { user: mock.user, isMock: true };
    }
    throw new Error("Unauthorized");
  }
}

/**
 * Scope the list to what this user is actually a party to — a client sees only
 * their own bookings, a provider only bookings addressed to their provider
 * row. ADMIN (and demo/mock mode) see everything. Fails CLOSED: an unknown
 * role yields no bookings rather than all of them.
 */
function bookingVisibilityWhere(
  sessionUser: { id: string; role?: string | null },
): SQL | undefined {
  const role = sessionUser.role ?? "CLIENT";
  if (role === "ADMIN") return undefined;
  if (role === "PROVIDER") return eq(providers.userId, sessionUser.id);
  if (role === "CLIENT") return eq(bookings.clientId, sessionUser.id);
  // Unknown role: match nothing (fails CLOSED, never open).
  return sql`1 = 0`;
}

async function getBookings(sessionUser: { id: string; role?: string | null }, seeAll: boolean) {
  try {
    const visibility = seeAll ? undefined : bookingVisibilityWhere(sessionUser);
    const rows = await db
      .select({
        booking: bookings,
        payment: payments,
        provider: providers,
        client: user,
        pkg: servicePackages,
      })
      .from(bookings)
      .leftJoin(payments, eq(payments.bookingId, bookings.id))
      .leftJoin(providers, eq(providers.id, bookings.providerId))
      .leftJoin(user, eq(user.id, bookings.clientId))
      .leftJoin(servicePackages, eq(servicePackages.id, bookings.packageId))
      .where(visibility)
      .orderBy(desc(bookings.createdAt));

    return rows.map((row) => ({
      booking: {
        ...row.booking,
        status: row.booking.status as IBooking["status"],
        escrowState: row.booking.escrowState as IBooking["escrowState"],
        paymentMode: (row.booking.paymentMode ?? "ESCROW") as IBooking["paymentMode"],
        serviceDate: row.booking.serviceDate?.toISOString() ?? null,
        releaseDeadline: row.booking.releaseDeadline?.toISOString() ?? null,
        createdAt: row.booking.createdAt.toISOString(),
        updatedAt: row.booking.updatedAt.toISOString(),
      } as IBooking,
      payment: row.payment
        ? ({
            ...row.payment,
            createdAt: row.payment.createdAt.toISOString(),
          } as IPayment)
        : null,
      providerName: row.provider?.displayName ?? "Unknown",
      clientName: row.client?.name ?? "Unknown",
      packageLabel: row.pkg?.label ?? "Unknown",
    }));
  } catch {
    if (MockDataService.isEnabled()) {
      const mockBookings = MockDataService.getMockBookings();
      return mockBookings.map((b) => ({
        booking: b,
        payment: null,
        providerName: providerNames[b.providerId] ?? "Mock Provider",
        clientName: "Demo Client",
        packageLabel: "Standard Package",
      }));
    }
    return [];
  }
}

export default async function BookingsPage() {
  const { user: sessionUser, isMock } = await getSessionUser();
  const allBookings = await getBookings(sessionUser, isMock);

  const grouped = statusGroups.map((group) => ({
    ...group,
    bookings: allBookings.filter((b) => group.statuses.includes(b.booking.status)),
  }));

  return <BookingsListClient groups={grouped} />;
}
