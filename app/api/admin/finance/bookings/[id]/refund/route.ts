import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { FinanceService } from "@/services/FinanceService";

/**
 * ADMIN refund of held escrow funds back to the payer. Delegates to the same
 * EscrowService.refundBookingFunds money path the dispute-resolution flow
 * uses (wallet-funded refunds credit locally with a deterministic reference;
 * card-funded refunds flip HELD→REFUNDED before requesting Paystack), then
 * writes both a booking-level and per-payment audit entry.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireRole("ADMIN");
    const { id } = await params;
    const result = await new FinanceService().adminSettleBooking(id, session.user.id, "REFUNDED");
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    if (msg === "Forbidden" || msg === "Unauthorized") {
      return NextResponse.json({ success: false, error: msg }, { status: msg === "Forbidden" ? 403 : 401 });
    }
    if (msg === "Booking not found") return NextResponse.json({ success: false, error: msg }, { status: 404 });
    if (msg.includes("No held payments") || msg.includes("already completed") || msg.includes("disputed")) {
      return NextResponse.json({ success: false, error: msg }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
