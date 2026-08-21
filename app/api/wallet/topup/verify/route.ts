import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { verifyTransaction } from "@/lib/paystack";
import { WalletService } from "@/services/WalletService";

/**
 * Verifies a Paystack wallet top-up on the post-payment callback page and
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

    const verified = await verifyTransaction(reference);

    // Trust metadata echoed by Paystack over the reference prefix alone.
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
      await new WalletService().topUpFromCard(userId, verified.amountKobo, reference);
      credited = true;
    }

    return NextResponse.json({
      success: true,
      data: {
        status: verified.status,
        amountKobo: verified.amountKobo,
        credited,
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