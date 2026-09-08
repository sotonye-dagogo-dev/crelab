import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { BookingService } from "@/services/BookingService";
import { EscrowService } from "@/services/EscrowService";
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

    // Wallet direct path (tightened ACID): debit immediately, set HELD without Paystack
    if (useWallet) {
      const walletService = new WalletService();
      const config = await PlatformConfigService.get();
      // Atomic wallet debit for escrow bookings
      await walletService.debitForBooking(session.user.id, bookingId, booking.total, booking.fee);
      // Transition to HELD
      const escrow = new EscrowService();
      // Reuse internal transition: update booking to HELD and create payment record
      // Direct wallet escrow doesn't need paystackRef; we simulate success with wallet reference
      const { db } = await import("@/lib/db");
      const { bookings, payments } = await import("@/drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const releaseDeadline = new Date(booking.serviceDate!);
      releaseDeadline.setDate(releaseDeadline.getDate() + config.escrowReleaseDays);
      await db.transaction(async (tx) => {
        await tx.update(bookings).set({ status: "HELD", escrowState: "HELD", releaseDeadline, updatedAt: new Date() }).where(eq(bookings.id, bookingId));
        await tx.insert(payments).values({
          id: crypto.randomUUID(),
          bookingId,
          amount: booking.total,
          fee: booking.fee,
          netAmount: booking.total - booking.fee,
          paystackRef: `WALLET-${bookingId}-${Date.now()}`,
          status: "HELD",
        });
      });
      return NextResponse.json({ success: true, data: { method: "WALLET", walletDebited: true } });
    }

    // Paystack path — tightened: uses real client email + metadata for webhook attribution
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
