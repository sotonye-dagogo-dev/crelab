import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { BookingService } from "@/services/BookingService";
import { EscrowService, computeEscrowReleaseDeadline } from "@/services/EscrowService";
import { WalletService } from "@/services/WalletService";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import {
  DEFAULT_PAYMENT_UNAVAILABLE_MESSAGE,
  isPaymentProviderUnavailable,
  paymentUnavailableResponse,
} from "@/lib/payments/http";
import { resolvePaymentStatusCopy } from "@/lib/payments/status";

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

    // Pre-flight: a previous card checkout may have actually gone through even
    // though the booking is still ACCEPTED (webhook not yet delivered / verify
    // hold did not land). Starting a NEW Paystack checkout here would double
    // charge the client. `reconcileBooking` is processor-verified — it either
    // confirms the charge never happened (safe to proceed), finishes the hold
    // (report success), or reports a real charge that is still in flight /
    // needs review (block and surface an honest message).
    const existingRef = booking.paystackRef;
    if (existingRef && !existingRef.startsWith("WALLET-")) {
      const escrow = new EscrowService();
      const preflight = await escrow.reconcileBooking(bookingId, {
        actorId: session.user.id,
        audit: true,
      });

      if (preflight.alreadyHeld || preflight.held) {
        // Earlier attempt succeeded (and now finished holding) — report success
        // instead of charging again.
        return NextResponse.json({
          success: true,
          data: { method: "ALREADY_HELD", held: true, bookingStatus: preflight.bookingStatus },
        });
      }

      if (preflight.outcome === "charge_pending" || preflight.outcome === "unverifiable") {
        // A charge is still settling (or the processor is unreachable) — must
        // not start a second one. The client UI retries / polls on this.
        return NextResponse.json(
          { success: false, error: "Your previous payment is still processing — please wait a moment and try again, or contact support if this persists.", reason: preflight.outcome },
          { status: 409 },
        );
      }

      if (preflight.outcome !== "not_charged" && preflight.outcome !== "no_reference") {
        // amount_mismatch / attribution_mismatch / not_payable / duplicate_charge
        // — the service already audited it; block and tell the truth.
        return NextResponse.json(
          { success: false, error: preflight.detail ?? "Your previous payment could not be applied to this booking — support has been notified.", reason: preflight.outcome },
          { status: 409 },
        );
      }
      // "not_charged" or "no_reference" → no successful charge on record: safe
      // to start a fresh checkout below.
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
    if (isPaymentProviderUnavailable(err)) {
      let message = DEFAULT_PAYMENT_UNAVAILABLE_MESSAGE;
      try {
        message = resolvePaymentStatusCopy(
          await PlatformConfigService.get(),
          "unavailable",
        ).body;
      } catch {
        // Config read failed — fall back to the stable message above.
      }
      return paymentUnavailableResponse(message);
    }
    const msg = err instanceof Error ? err.message : "Internal server error";
    const status = msg.includes("Insufficient") ? 400 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
