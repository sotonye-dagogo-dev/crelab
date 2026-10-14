import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { EscrowService } from "@/services/EscrowService";
import { AuditService } from "@/services/AuditService";

const MIN_REASON_LENGTH = 10;
const MAX_REASON_LENGTH = 2000;

/**
 * Client raises a dispute on an in-progress booking (DisputeModal). Ownership
 * comes from the session — the body's clientId is never trusted. The service
 * validates the booking state and the effective release deadline.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();
    const { id: bookingId } = await params;
    const body = await req.json().catch(() => ({}));
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (reason.length < MIN_REASON_LENGTH) {
      return NextResponse.json(
        { success: false, error: `Please describe the issue in at least ${MIN_REASON_LENGTH} characters` },
        { status: 400 },
      );
    }
    if (reason.length > MAX_REASON_LENGTH) {
      return NextResponse.json(
        { success: false, error: `Reason must be at most ${MAX_REASON_LENGTH} characters` },
        { status: 400 },
      );
    }

    const escrowService = new EscrowService();
    const dispute = await escrowService.raiseDispute(bookingId, session.user.id, reason);

    await AuditService.log({
      userId: session.user.id,
      action: "escrow.dispute.raise",
      entity: "bookings",
      entityId: bookingId,
      newValue: { disputeId: dispute.id },
    }).catch((err) => {
      console.error(`[escrow] audit log failed for dispute on booking ${bookingId}`, err);
    });

    return NextResponse.json({ success: true, data: { dispute } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    if (msg === "Unauthorized") return NextResponse.json({ success: false, error: msg }, { status: 401 });
    if (msg === "Booking not found") return NextResponse.json({ success: false, error: msg }, { status: 404 });
    if (msg.startsWith("Only the client")) return NextResponse.json({ success: false, error: msg }, { status: 403 });
    if (msg.includes("IN_PROGRESS") || msg.includes("deadline")) {
      return NextResponse.json({ success: false, error: msg }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
