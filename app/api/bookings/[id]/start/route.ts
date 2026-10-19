import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { EscrowService } from "@/services/EscrowService";
import { BookingService } from "@/services/BookingService";
import { AuditService } from "@/services/AuditService";
import { assertProviderActor } from "@/lib/booking-access";
import { bookingActionErrorResponse } from "@/lib/booking-action-errors";

/**
 * Provider (or admin) starts work on a paid booking — HELD → IN_PROGRESS
 * (the provider-side "Start Work" action from the OD-8 design spec). The flip
 * lives in EscrowService and touches no money columns; settlement is still
 * governed by the release deadline + client confirm / cron auto-release.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const bookingService = new BookingService();
    const booking = await bookingService.getById(id);
    if (!booking) {
      return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
    }

    await assertProviderActor(booking, session.user);

    const escrowService = new EscrowService();
    const updated = await escrowService.startBooking(id);

    await AuditService.log({
      userId: session.user.id,
      action: "booking.start",
      entity: "bookings",
      entityId: id,
      oldValue: { status: booking.status },
      newValue: { status: updated.status, actorRole: session.user.role ?? "CLIENT" },
    }).catch((err) => {
      console.error(`[booking] audit log failed for start of booking ${id}`, err);
    });

    return NextResponse.json({ success: true, data: { booking: updated } });
  } catch (err) {
    const { status, error } = bookingActionErrorResponse(err, "start");
    return NextResponse.json({ success: false, error }, { status });
  }
}
