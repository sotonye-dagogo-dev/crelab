import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { BookingService } from "@/services/BookingService";
import { EscrowService } from "@/services/EscrowService";
import { getRecordedRuntime } from "@/lib/payments/runtime";
import { asPaymentProviderId } from "@/lib/payments/config";
import { holdFailureMessage, isHoldPending, parseBookingIdFromRef } from "@/lib/payment-flow";

/**
 * Verifies a booking card payment on the client's callback (popup success or
 * return from the hosted checkout) — the platform never reports success based
 * on its own 200 or the popup callback alone ("Payment Truthfulness: verify,
 * don't assume"). The webhook remains the primary finalizer; this endpoint
 * makes the UI truthful and converges on the same idempotent
 * `onPaystackSuccess` hold, so webhook + verify running together can never
 * double-hold.
 */
async function handleVerify(
  reference: string | null,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();
    const { id: bookingId } = await params;

    if (!reference) {
      return NextResponse.json({ success: false, error: "Missing reference" }, { status: 400 });
    }

    const bookingService = new BookingService();
    const booking = await bookingService.getById(bookingId);
    if (!booking) {
      return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
    }
    if (booking.clientId !== session.user.id) {
      return NextResponse.json({ success: false, error: "Only the client can verify this payment" }, { status: 403 });
    }
    // Wallet-funded payments have no processor transaction to verify — the debit
    // already happened synchronously server-side.
    if (reference.startsWith("WALLET-")) {
      return NextResponse.json({ success: false, error: "Not a card payment" }, { status: 400 });
    }
    // A charge reference must be attributable to THIS booking. The stored
    // `paystackRef` is the primary key, but `initiate()` regenerates it on every
    // checkout attempt — so a charge made under an EARLIER attempt (popup kept
    // alive, double-click) would be wrongly rejected by a strict equality check.
    // The id embedded in the reference (`CRELLAB-{bookingId}-{millis}`) is the
    // stable attribution; accept it as a fallback so verify still finalizes.
    const referenceMatches =
      booking.paystackRef === reference ||
      parseBookingIdFromRef(reference) === bookingId;
    if (!referenceMatches) {
      return NextResponse.json({ success: false, error: "Reference does not match this booking" }, { status: 400 });
    }

    // Fast path: the webhook already held these funds — nothing to ask Paystack.
    if (booking.status === "HELD" || booking.escrowState === "HELD") {
      return NextResponse.json({
        success: true,
        data: { status: "success", verified: true, bookingStatus: booking.status },
      });
    }

    const provider = asPaymentProviderId(booking.paymentProvider) ?? "PAYSTACK";
    const testMode = booking.paymentTestMode ?? false;
    const { adapter } = getRecordedRuntime(provider, testMode);
    const verified = await adapter.verifyTransaction(reference, testMode);

    // Trust the metadata the processor echoes over the reference prefix alone —
    // a reference string alone must never be enough to move a booking to HELD.
    const metaPurpose = verified.metadata?.purpose as string | undefined;
    const metaBookingId = verified.metadata?.bookingId as string | undefined;
    const metaClientId = verified.metadata?.clientId as string | undefined;
    if (metaPurpose !== "BOOKING_PAYMENT" || metaBookingId !== bookingId || metaClientId !== session.user.id) {
      return NextResponse.json({ success: false, error: "Transaction does not belong to this booking" }, { status: 403 });
    }

    let verifiedOk = false;
    let holdPending = false;
    if (verified.status === "success") {
      if (verified.amountKobo !== booking.total) {
        // Charged amount ≠ booked amount — never settle a mismatch silently.
        console.error(
          `[escrow] verify amount mismatch for ref ${reference}: paid ${verified.amountKobo} kobo, booking ${bookingId} expects ${booking.total} kobo`,
        );
        return NextResponse.json({
          success: false,
          error: "Payment amount does not match this booking — support has been notified",
          data: { status: verified.status, verified: false, reason: "amount_mismatch" },
        }, { status: 409 });
      }

      const escrowService = new EscrowService();
      const hold = await escrowService.onPaystackSuccess(reference, {
        bookingId,
        provider: verified.provider,
        testMode: verified.testMode,
        providerReference: verified.providerReference,
      });
      if (hold.held || hold.alreadyHeld) {
        // The money is now (or already was) in escrow — the only honest
        // "verified" signal. This is what the client's "Payment received"
        // confirmation must be gated on.
        verifiedOk = true;
      } else if (isHoldPending(hold)) {
        // Charge is real but the ACCEPTED→HELD transition did not land yet
        // (replica lag / concurrent writer). Do NOT report failure (the charge
        // succeeded) and do NOT report success (nothing is held) — signal the
        // client to poll again.
        holdPending = true;
      } else {
        // Permanent refusal (not payable / duplicate charge / no booking) —
        // the service already logged + audited it. Report the truth and never
        // "verified".
        return NextResponse.json({
          success: false,
          error: holdFailureMessage(hold) ?? "Payment could not be applied to this booking — support has been notified",
          data: { status: verified.status, verified: false, reason: hold.reason ?? "hold_failed" },
        }, { status: 409 });
      }
    }

    const fresh = await bookingService.getById(bookingId);
    return NextResponse.json({
      success: true,
      data: {
        status: verified.status,
        verified: verifiedOk,
        bookingStatus: fresh?.status ?? booking.status,
        ...(verifiedOk
          ? {}
          : holdPending
            ? { reason: "hold_pending" }
            : { reason: "not_completed" }),
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    // Paystack unreachable/verify error — report honestly; never "verified".
    const msg = err instanceof Error ? err.message : "Payment verification failed";
    return NextResponse.json(
      { success: false, error: `Could not verify payment with our payment processor: ${msg}` },
      { status: 502 },
    );
  }
}

/**
 * GET mirrors the wallet top-up verify precedent (`?reference=`); POST is the
 * canonical shape from the payment-tightening plan (reference in the body).
 * Both run the exact same idempotent verify → hold flow.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleVerify(req.nextUrl.searchParams.get("reference"), { params });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const body = (await req.json().catch(() => ({}))) as { reference?: unknown };
  const reference =
    typeof body.reference === "string" && body.reference
      ? body.reference
      : req.nextUrl.searchParams.get("reference");
  return handleVerify(reference, { params });
}
