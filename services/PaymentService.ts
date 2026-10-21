import { db } from "@/lib/db";
import { payments, bookings } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { getRecordedRuntime } from "@/lib/payments/runtime";
import { PaymentProviderService } from "@/services/PaymentProviderService";
import { asPaymentProviderId } from "@/lib/payments/config";

export class PaymentService {
  async initPaystack(
    bookingId: string,
    amountKobo: number,
    email: string,
  ): Promise<{
    authorizationUrl: string;
    accessCode: string | null;
    reference: string;
  }> {
    const ref = `CRELLAB-PAY-${bookingId}-${Date.now()}`;
    const { runtime, adapter } = await PaymentProviderService.getRuntime();
    const result = await adapter.initTransaction(
      {
        amountKobo,
        email,
        reference: ref,
        metadata: { purpose: "BOOKING_PAYMENT", bookingId, provider: runtime.provider, testMode: runtime.testMode },
      },
      runtime.testMode,
    );
    await db
      .update(bookings)
      .set({
        paystackRef: ref,
        paymentProvider: runtime.provider,
        paymentTestMode: runtime.testMode,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId));
    return result;
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
    if ((asPaymentProviderId(payment.provider) ?? "PAYSTACK") !== "PAYSTACK") {
      throw new Error("Split payouts are only supported by Paystack; use the standard payout flow");
    }

    const res = await fetch(
      `https://api.paystack.co/transaction/split/${payment.paystackRef}`,
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

    if (!booking?.paystackRef) throw new Error("No payment reference found");
    const [payment] = await db.select().from(payments).where(eq(payments.bookingId, bookingId));
    if (!payment) throw new Error("Payment not found for booking");
    const provider = asPaymentProviderId(payment.provider) ?? "PAYSTACK";
    const { adapter } = getRecordedRuntime(provider, payment.testMode);
    await adapter.refund(
      {
        reference: payment.paystackRef,
        providerReference: payment.providerRef,
        amountKobo: payment.amount,
        reason: "Booking refund",
      },
      payment.testMode,
    );

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
