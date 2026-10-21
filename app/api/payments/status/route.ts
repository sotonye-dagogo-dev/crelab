import { NextResponse } from "next/server";
import { PaymentProviderService } from "@/services/PaymentProviderService";

export const dynamic = "force-dynamic";

/**
 * Public, sanitised payment-rail status.
 *
 * Deliberately exposes only what a user-facing banner needs: whether a payment
 * can be started, whether the next checkout is sandbox (test mode), whether a
 * fallback handled routing, and whether bank-transfer top-ups (Paystack DVA)
 * are available. Provider identities, credential state and outage reasons stay
 * on the admin side (`/admin` shell banner + finance/analytics).
 */
export async function GET() {
  try {
    const status = await PaymentProviderService.getStatus();
    return NextResponse.json(
      {
        success: true,
        data: {
          available: status.available,
          testMode: status.testMode,
          fallbackUsed: status.fallbackUsed,
          bankTransferAvailable: status.bankTransferAvailable,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    // A status probe must never look like a payment outage on its own; the
    // money routes still return their own truthful errors.
    console.error("[payments/status] failed to resolve payment status", err);
    return NextResponse.json(
      {
        success: false,
        error: "Payment status is temporarily unavailable",
        data: {
          available: true,
          testMode: false,
          fallbackUsed: false,
          bankTransferAvailable: true,
        },
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }
}
