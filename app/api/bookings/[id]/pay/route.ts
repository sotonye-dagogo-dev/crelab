import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { BookingService } from "@/services/BookingService";
import { EscrowService, computeEscrowReleaseDeadline } from "@/services/EscrowService";
import { WalletService } from "@/services/WalletService";
import { PlatformConfigService } from "@/services/PlatformConfigService";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id: bookingId } = await params;
    const body = await req.json().catch(() => ({}));
    const useWallet = body.useWallet === true;
    const bookingService = new BookingService();
    const booking = await bookingService.getById(bookingId);
    if (!booking) return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
    if (booking.clientId !== session.user.id) return NextResponse.json({ success: false, error: "Only the client can pay for this booking" }, { status: 403 });
    if (booking.status !== "ACCEPTED") return NextResponse.json({ success: false, error: "Booking must be ACCEPTED before payment" }, { status: 400 });
    // Milestone bookings are funded milestone-by-milestone through the milestone
    // flow — paying the full escrow amount here would double-fund the booking.
    if (booking.paymentMode === "MILESTONE") {
      return NextResponse.json(
        { success: false, error: "This booking is funded per milestone — approve and fund each milestone instead of paying the full amount" },
        { status: 400 },
      );
    }

    // Wallet direct path (tightened ACID): debit immediately, set HELD without Paystack
    if (useWallet) {
      const walletService = new WalletService();
      const config = await PlatformConfigService.get();
      // Atomic wallet debit for escrow bookings — throws InsufficientBalanceError (→400)
      await walletService.debitForBooking(session.user.id, bookingId, booking.total, booking.fee);

      const escrow = new EscrowService();
      const releaseDeadline = computeEscrowReleaseDeadline(booking.serviceDate, config.escrowReleaseDays);
      let held = false;
      try {
        // Exactly-once ACCEPTED→HELD + payment row (WALLET ref marks funding source).
        held = await escrow.holdBookingFunds(
          bookingId,
          `WALLET-${bookingId}-${Date.now()}`,
          releaseDeadline,
        );
      } catch (err) {
        // Escrow never started after the debit — restore the client's balance
        // before surfacing the failure, so money is never silently stranded.
        try {
          await walletService.reverseBookingDebit(session.user.id, bookingId, booking.total, booking.fee);
        } catch (revertErr) {
          console.error(
            `[escrow] wallet debit reversal failed for booking ${bookingId} after hold error — manual wallet correction required`,
            revertErr,
          );
        }
        throw err;
      }

      if (!held) {
        // Booking left the payable state between the route check and the hold
        // (concurrent payment/cancel) — reverse the debit the same way.
        try {
          await walletService.reverseBookingDebit(session.user.id, bookingId, booking.total, booking.fee);
        } catch (revertErr) {
          console.error(
            `[escrow] wallet debit reversal failed for booking ${bookingId} (hold lost race) — manual wallet correction required`,
            revertErr,
          );
        }
        return NextResponse.json({ success: false, error: "Booking is no longer awaiting payment" }, { status: 409 });
      }

      return NextResponse.json({ success: true, data: { method: "WALLET", walletDebited: true } });
    }

    // Paystack path — returns the checkout handle; the charge is finalized
    // server-side by the webhook (primary) or /pay/verify (client confirm).
    const escrowService = new EscrowService();
    const result = await escrowService.initiate(bookingId);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const msg = err instanceof Error ? err.message : "Internal server error";
    const status = msg.includes("Insufficient") ? 400 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
