import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { bookings, payments, disputes, providers, servicePackages, user } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { BookingDetailClient } from "./BookingDetailClient";
import type { IBooking, IPayment, IDispute } from "@/types";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

async function getBookingDetail(id: string) {
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
    .where(eq(bookings.id, id));

  if (rows.length === 0) return null;

  const row = rows[0];
  const booking: IBooking = {
    ...row.booking,
    status: row.booking.status as IBooking["status"],
    escrowState: row.booking.escrowState as IBooking["escrowState"],
    serviceDate: row.booking.serviceDate?.toISOString() ?? null,
    releaseDeadline: row.booking.releaseDeadline?.toISOString() ?? null,
    createdAt: row.booking.createdAt.toISOString(),
    updatedAt: row.booking.updatedAt.toISOString(),
  };

  const payment: IPayment | null = row.payment
    ? {
        ...row.payment,
        createdAt: row.payment.createdAt.toISOString(),
      }
    : null;

  return {
    booking,
    payment,
    provider: row.provider ? {
      id: row.provider.id,
      displayName: row.provider.displayName,
      avatarUrl: row.provider.avatarUrl,
    } : null,
    client: row.client ? {
      id: row.client.id,
      name: row.client.name,
    } : null,
    package: row.pkg ? {
      id: row.pkg.id,
      label: row.pkg.label,
      tier: row.pkg.tier,
      deliverables: row.pkg.deliverables as string[],
      turnaroundDays: row.pkg.turnaroundDays,
    } : null,
  };
}

export default async function BookingDetailPage({ params }: Props) {
  const { id } = await params;
  const data = await getBookingDetail(id);

  if (!data) notFound();

  return <BookingDetailClient data={data} />;
}
