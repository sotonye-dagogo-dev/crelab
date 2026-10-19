import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { BookingService } from "@/services/BookingService";
import { AuditService } from "@/services/AuditService";
import { assertProviderActor } from "@/lib/booking-access";
import { bookingActionErrorResponse } from "@/lib/booking-action-errors";

/**
 * Provider (or admin) declines a booking request — REQUESTED → DECLINED
 * (terminal, no money has moved). Mirrors the accept route exactly: session
 * ownership, LEGAL_TRANSITIONS validation, best-effort audit.
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
    const updated = await bookingService.declineRequest(id);

    await AuditService.log({
      userId: session.user.id,
      action: "booking.decline",
      entity: "bookings",
      entityId: id,
      oldValue: { status: booking.status },
      newValue: { status: updated.status, actorRole: session.user.role ?? "CLIENT" },
    }).catch((err) => {
      console.error(`[booking] audit log failed for decline of booking ${id}`, err);
    });

    return NextResponse.json({ success: true, data: { booking: updated } });
  } catch (err) {
    const { status, error } = bookingActionErrorResponse(err, "decline");
    return NextResponse.json({ success: false, error }, { status });
  }
}
