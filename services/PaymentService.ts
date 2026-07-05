import { db } from "@/lib/db";
import { payments, bookings } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { initTransaction, refund } from "@/lib/paystack";

export class PaymentService {
  async initPaystack(
    bookingId: string,
    amountKobo: number,
    email: string,
  ): Promise<{
    authorizationUrl: string;
    accessCode: string;
    reference: string;
  }> {
    const ref = `CRELAB-PAY-${bookingId}-${Date.now()}`;
    return initTransaction(amountKobo, email, ref);
  }

  async splitPayout(
    bookingId: string,
    providerSubaccountCode: string,
  ): Promise<void> {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.bookingId, bookingId));

    if (!payment) throw new Error("Payment not found for booking");

    const res = await fetch(
      "https://api.paystack.co/transaction/split/${payment.paystackRef}",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subaccount: providerSubaccountCode,
          amount: payment.netAmount,
        }),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Paystack split payout failed: ${res.status} ${body}`);
    }
  }

  async refund(bookingId: string): Promise<void> {
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId));

    if (!booking?.paystackRef) throw new Error("No paystack ref found");

    await refund(booking.paystackRef);

    await db
      .update(bookings)
      .set({
        status: "REFUNDED",
        escrowState: "REFUNDED",
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId));
  }
}
