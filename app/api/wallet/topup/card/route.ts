import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { PaymentProviderService } from "@/services/PaymentProviderService";
import { appOrigin } from "@/lib/url";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { WalletService } from "@/services/WalletService";
import {
  DEFAULT_PAYMENT_UNAVAILABLE_MESSAGE,
  isPaymentProviderUnavailable,
  paymentUnavailableResponse,
} from "@/lib/payments/http";
import { resolvePaymentStatusCopy } from "@/lib/payments/status";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const userId = session.user.id;
    const email = session.user.email;

    const body = await req.json();
    const amountKobo = body.amountKobo as number;

    if (!amountKobo || amountKobo <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid amount" },
        { status: 400 },
      );
    }

    const platformConfig = await PlatformConfigService.get();
    if (amountKobo < platformConfig.wallet.minTopUpKobo) {
      return NextResponse.json(
        { success: false, error: `Minimum top-up is ${platformConfig.wallet.minTopUpKobo} kobo` },
        { status: 400 },
      );
    }

    const ref = `WALLET-TOPUP-${userId}-${Date.now()}`;

    await new WalletService().getOrCreate(userId);

    const { runtime, adapter } = await PaymentProviderService.getRuntime();
    const result = await adapter.initTransaction(
      {
        amountKobo,
        email,
        reference: ref,
        // Metadata lets the charge.success webhook attribute this payment to the
        // right wallet without trusting the amount/reference alone.
        metadata: {
          purpose: "WALLET_TOPUP",
          userId,
          provider: runtime.provider,
          testMode: runtime.testMode,
        },
        // Bring the customer back to a status page that verifies the transaction
        // so the wallet reflects what actually happened after payment.
        callbackUrl: `${appOrigin()}/wallet/payment-status?provider=${runtime.provider}&testMode=${runtime.testMode ? "1" : "0"}`,
        customerName: session.user.name ?? undefined,
      },
      runtime.testMode,
    );

    return NextResponse.json({
      success: true,
      data: { ...result, fallbackFrom: runtime.fallbackFrom },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
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
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
