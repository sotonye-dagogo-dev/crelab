import { db } from "@/lib/db";
import { bookings, payments, providers, servicePackages, user } from "@/drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { BookingsListClient } from "./BookingsListClient";
import type { IBooking, IPayment } from "@/types";

export const dynamic = "force-dynamic";

const statusGroups = [
  { key: "active", label: "Active", statuses: ["HELD", "IN_PROGRESS", "DISPUTED"] },
  { key: "requested", label: "Requests", statuses: ["REQUESTED", "ACCEPTED"] },
  { key: "completed", label: "Completed", statuses: ["RELEASED", "REFUNDED"] },
  { key: "cancelled", label: "Cancelled", statuses: ["DECLINED", "CANCELLED"] },
];

async function getBookings() {
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
    .orderBy(desc(bookings.createdAt));

  return rows.map((row) => ({
    booking: {
      ...row.booking,
      status: row.booking.status as IBooking["status"],
      escrowState: row.booking.escrowState as IBooking["escrowState"],
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
}

export default async function BookingsPage() {
  const allBookings = await getBookings();

  const grouped = statusGroups.map((group) => ({
    ...group,
    bookings: allBookings.filter((b) =>
      group.statuses.includes(b.booking.status),
    ),
  }));

  return <BookingsListClient groups={grouped} />;
}
