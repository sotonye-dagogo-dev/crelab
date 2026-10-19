import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { bookings, payments, providers, servicePackages, user } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { MockDataService } from "@/services/MockDataService";
import { EscrowService } from "@/services/EscrowService";
import { consumeRateWindow } from "@/lib/rate-limit";
import { BookingDetailClient } from "./BookingDetailClient";
import type { IBooking, IPayment } from "@/types";

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
    paymentMode: (row.booking.paymentMode ?? "ESCROW") as IBooking["paymentMode"],
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

async function getSessionUser() {
  try {
    const session = await requireAuth();
    return session.user;
  } catch {
    if (MockDataService.isEnabled()) {
      return MockDataService.getMockSession().user;
    }
    throw new Error("Unauthorized");
  }
}

/**
 * Who is looking at this booking? ADMIN always passes; otherwise the viewer
 * must be the booking's client or its provider — anything else is treated as
 * "not found" (no existence leak). Fails CLOSED if the provider row can't be
 * read: an unreadable provider record must not open the booking to strangers.
 */
async function resolveViewerRole(
  sessionUser: { id: string; role?: string | null },
  booking: IBooking,
): Promise<"CLIENT" | "PROVIDER" | "ADMIN" | null> {
  const role = sessionUser.role ?? "CLIENT";
  if (role === "ADMIN") return "ADMIN";
  if (sessionUser.id === booking.clientId) return "CLIENT";

  try {
    const rows = await db
      .select({ id: providers.id })
      .from(providers)
      .where(
        and(eq(providers.id, booking.providerId), eq(providers.userId, sessionUser.id)),
      );
    if (rows.length > 0) return "PROVIDER";
  } catch {
    return null;
  }

  // Mock/demo mode: the mock session user won't own real rows — still show the
  // booking so the demo stays walkable (matches the API routes' bypass).
  if (MockDataService.isEnabled()) return "CLIENT";

  return null;
}

/**
 * Self-heal a "charged but never held" booking when its own page is viewed.
 *
 * The webhook + cron are the primary finalizers, but a stuck booking (ACCEPTED
 * + escrow PENDING + a stored card reference, untouched for over a minute) can
 * otherwise sit forever with the client staring at "awaiting payment" while
 * their card was charged. Viewing the booking is the highest-signal moment to
 * retry the hold — processor-verified, rate-limited per viewer, and bounded by
 * a timeout so a slow Paystack call can never stall the page render.
 */
async function maybeReconcileStuckBooking(
  data: { booking: IBooking },
  viewerId: string,
): Promise<void> {
  const { booking } = data;
  if (booking.status !== "ACCEPTED") return;
  if (booking.escrowState !== "PENDING") return;
  if (booking.paymentMode === "MILESTONE") return;
  if (!booking.paystackRef || booking.paystackRef.startsWith("WALLET-")) return;

  // Only retry once the booking has actually been sitting still — a fresh
  // ACCEPTED (provider just accepted, checkout not started) has nothing charged.
  const ageMs = Date.now() - new Date(booking.updatedAt).getTime();
  if (ageMs < 60_000) return;

  const budget = consumeRateWindow(`booking-reconcile:${viewerId}`, {
    limit: 5,
    windowMs: 60_000,
  });
  if (!budget.allowed) return;

  try {
    const escrow = new EscrowService();
    const work = escrow.reconcileBooking(booking.id, {
      actorId: viewerId,
      audit: true,
    });
    const timeout = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 8_000),
    );
    await Promise.race([work, timeout]);
  } catch (err) {
    console.error(
      `[escrow] booking-detail self-heal failed for booking ${booking.id}:`,
      err,
    );
  }
}

export default async function BookingDetailPage({ params }: Props) {
  const { id } = await params;
  let data = await getBookingDetail(id);

  if (!data) notFound();

  const sessionUser = await getSessionUser();
  const viewerRole = await resolveViewerRole(sessionUser, data.booking);

  // Nobody outside the booking (and admins) may see it at all — a guessed id
  // must 404 the same way a missing booking does.
  if (!viewerRole) notFound();

  await maybeReconcileStuckBooking(data, sessionUser.id);

  // Re-read after the self-heal so the page renders the post-hold truth (the
  // reconcile may have moved ACCEPTED → HELD).
  data = (await getBookingDetail(id)) ?? data;

  return <BookingDetailClient data={data} viewerRole={viewerRole} />;
}
