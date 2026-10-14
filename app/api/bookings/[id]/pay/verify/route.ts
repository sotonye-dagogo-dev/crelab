import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { BookingService } from "@/services/BookingService";
import { EscrowService } from "@/services/EscrowService";
import { verifyTransaction } from "@/lib/paystack";

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
    // Wallet-funded payments have no Paystack transaction to verify — the debit
    // already happened synchronously server-side.
    if (reference.startsWith("WALLET-")) {
      return NextResponse.json({ success: false, error: "Not a card payment" }, { status: 400 });
    }
    if (!booking.paystackRef || booking.paystackRef !== reference) {
      return NextResponse.json({ success: false, error: "Reference does not match this booking" }, { status: 400 });
    }

    // Fast path: the webhook already held these funds — nothing to ask Paystack.
    if (booking.status === "HELD" || booking.escrowState === "HELD") {
      return NextResponse.json({
        success: true,
        data: { status: "success", verified: true, bookingStatus: booking.status },
      });
    }

    const verified = await verifyTransaction(reference);

    // Trust the metadata Paystack echoes over the reference prefix alone — a
    // reference string alone must never be enough to move a booking to HELD.
    const metaPurpose = verified.metadata?.purpose as string | undefined;
    const metaBookingId = verified.metadata?.bookingId as string | undefined;
    const metaClientId = verified.metadata?.clientId as string | undefined;
    if (metaPurpose !== "BOOKING_PAYMENT" || metaBookingId !== bookingId || metaClientId !== session.user.id) {
      return NextResponse.json({ success: false, error: "Transaction does not belong to this booking" }, { status: 403 });
    }

    let verifiedOk = false;
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
      await escrowService.onPaystackSuccess(reference); // idempotent — false = webhook already held it
      verifiedOk = true;
    }

    const fresh = await bookingService.getById(bookingId);
    return NextResponse.json({
      success: true,
      data: {
        status: verified.status,
        verified: verifiedOk,
        bookingStatus: fresh?.status ?? booking.status,
        ...(verifiedOk ? {} : { reason: "not_completed" }),
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
