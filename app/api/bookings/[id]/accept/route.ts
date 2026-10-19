import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { BookingService } from "@/services/BookingService";
import { AuditService } from "@/services/AuditService";
import { assertProviderActor } from "@/lib/booking-access";
import { bookingActionErrorResponse } from "@/lib/booking-action-errors";

/**
 * Provider (or admin) accepts a booking request — REQUESTED → ACCEPTED, the
 * gate that makes the booking payable (`/pay` requires ACCEPTED). Ownership
 * comes from the session via `assertProviderActor`; the state transition is
 * validated by BookingService's LEGAL_TRANSITIONS map, and the audit entry is
 * written best-effort so a logging hiccup never blocks a legitimate action.
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
    const updated = await bookingService.acceptRequest(id);

    await AuditService.log({
      userId: session.user.id,
      action: "booking.accept",
      entity: "bookings",
      entityId: id,
      oldValue: { status: booking.status },
      newValue: { status: updated.status, actorRole: session.user.role ?? "CLIENT" },
    }).catch((err) => {
      console.error(`[booking] audit log failed for accept of booking ${id}`, err);
    });

    return NextResponse.json({ success: true, data: { booking: updated } });
  } catch (err) {
    const { status, error } = bookingActionErrorResponse(err, "accept");
    return NextResponse.json({ success: false, error }, { status });
  }
}
