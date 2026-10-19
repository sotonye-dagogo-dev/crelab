import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { BookingService } from "@/services/BookingService";
import { AuditService } from "@/services/AuditService";
import { assertClientActor } from "@/lib/booking-access";
import { bookingActionErrorResponse } from "@/lib/booking-action-errors";

/**
 * Client cancels their own booking — REQUESTED/ACCEPTED only. BookingService
 * refuses a HELD (paid) booking with dispute/support guidance, so this route
 * can never be used to bypass escrow: returning held funds stays exclusive to
 * EscrowService.refundBookingFunds (dispute resolution / admin refund).
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

    assertClientActor(booking, session.user);
    const updated = await bookingService.cancelBooking(id, session.user.id);

    await AuditService.log({
      userId: session.user.id,
      action: "booking.cancel",
      entity: "bookings",
      entityId: id,
      oldValue: { status: booking.status },
      newValue: { status: updated.status, actorRole: session.user.role ?? "CLIENT" },
    }).catch((err) => {
      console.error(`[booking] audit log failed for cancel of booking ${id}`, err);
    });

    return NextResponse.json({ success: true, data: { booking: updated } });
  } catch (err) {
    const { status, error } = bookingActionErrorResponse(err, "cancel");
    return NextResponse.json({ success: false, error }, { status });
  }
}
