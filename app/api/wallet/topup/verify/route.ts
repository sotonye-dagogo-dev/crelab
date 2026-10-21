import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getRecordedRuntime } from "@/lib/payments/runtime";
import { PaymentProviderService } from "@/services/PaymentProviderService";
import { asPaymentProviderId } from "@/lib/payments/config";
import type { PaymentProviderId } from "@/lib/payments/types";
import { WalletService } from "@/services/WalletService";

/**
 * Verifies a provider wallet top-up on the post-payment callback page and
 * credits the wallet immediately (idempotently) so the balance reflects what
 * actually happened — the platform never reports success based on its own 200
 * alone. The webhook remains the source of truth for server-side crediting;
 * this endpoint makes the redirect back to the app truthful too.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    const reference = req.nextUrl.searchParams.get("reference");
    if (!reference) {
      return NextResponse.json(
        { success: false, error: "Missing reference" },
        { status: 400 },
      );
    }

    // Only accept wallet top-up references. Anything else (e.g. a booking
    // payment ref) belongs to a different flow and is not credited here.
    const walletRefPrefix = `WALLET-TOPUP-${userId}-`;
    if (!reference.startsWith(walletRefPrefix)) {
      return NextResponse.json(
        { success: false, error: "Reference does not match a wallet top-up" },
        { status: 403 },
      );
    }

    // The callback URL is generated server-side at init with the processor and
    // mode that created the checkout. A forged value cannot fabricate a paid
    // transaction — verification still has to succeed at that processor.
    const providerParam = asPaymentProviderId(req.nextUrl.searchParams.get("provider"));
    const testModeParam = req.nextUrl.searchParams.get("testMode") === "1";
    let provider: PaymentProviderId;
    let testMode: boolean;
    if (providerParam) {
      provider = providerParam;
      testMode = testModeParam;
    } else {
      const runtime = (await PaymentProviderService.getRuntime()).runtime;
      provider = runtime.provider;
      testMode = runtime.testMode;
    }
    const { adapter } = getRecordedRuntime(provider, testMode);
    const verified = await adapter.verifyTransaction(reference, testMode);

    // Trust metadata echoed by the processor over the reference prefix alone.
    const metaUserId = verified.metadata?.userId as string | undefined;
    const metaPurpose = verified.metadata?.purpose as string | undefined;
    if (metaPurpose !== "WALLET_TOPUP" || metaUserId !== userId) {
      return NextResponse.json(
        { success: false, error: "Transaction does not belong to this account" },
        { status: 403 },
      );
    }

    let credited = false;
    if (verified.status === "success" && verified.amountKobo > 0) {
      await new WalletService().topUpFromCard(userId, verified.amountKobo, reference, {
        provider: verified.provider,
        testMode: verified.testMode,
      });
      credited = true;
    }

    return NextResponse.json({
      success: true,
      data: {
        status: verified.status,
        amountKobo: verified.amountKobo,
        credited,
        provider: verified.provider,
        testMode: verified.testMode,
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}