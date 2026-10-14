import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { EscrowService } from "@/services/EscrowService";
import { AuditService } from "@/services/AuditService";

/**
 * Client confirms release of escrow funds to the provider (EscrowTimeline's
 * "Confirm release" button). Exactly-once settlement lives in the service
 * (provider credit gated by the payments HELD→RELEASED flip), so double clicks
 * and races with the cron auto-release collapse to a single payout.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();
    const { id: bookingId } = await params;

    const escrowService = new EscrowService();
    const booking = await escrowService.clientConfirmRelease(bookingId, session.user.id);

    await AuditService.log({
      userId: session.user.id,
      action: "escrow.release",
      entity: "bookings",
      entityId: bookingId,
      newValue: { status: booking.status, releasedBy: "client" },
    }).catch((err) => {
      console.error(`[escrow] audit log failed for release of booking ${bookingId}`, err);
    });

    return NextResponse.json({ success: true, data: { booking } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    if (msg === "Unauthorized") return NextResponse.json({ success: false, error: msg }, { status: 401 });
    if (msg === "Booking not found") return NextResponse.json({ success: false, error: msg }, { status: 404 });
    if (msg.startsWith("Only the client")) return NextResponse.json({ success: false, error: msg }, { status: 403 });
    if (msg.includes("IN_PROGRESS")) return NextResponse.json({ success: false, error: msg }, { status: 400 });
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
