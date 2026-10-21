import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { WalletService } from "@/services/WalletService";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { isValidRecipientCode } from "@/lib/wallet-recipients";
import { PaymentProviderService } from "@/services/PaymentProviderService";

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole("PROVIDER", "ADMIN");
    const body = await req.json();
    const { amountKobo, bankRecipientCode, bankAccount } = body as {
      amountKobo?: number;
      bankRecipientCode?: string;
      bankAccount?: { accountNumber?: string; bankCode?: string; accountName?: string };
    };

    if (!amountKobo || amountKobo <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid amount" },
        { status: 400 },
      );
    }

    const { runtime } = await PaymentProviderService.getRuntime();
    const hasBankAccount = Boolean(
      bankAccount?.accountNumber && bankAccount?.bankCode && bankAccount?.accountName,
    );

    if (runtime.provider === "MONNIFY" && !hasBankAccount) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Enter the destination bank account number, bank code and account name for this payout.",
        },
        { status: 400 },
      );
    }

    if (!hasBankAccount && !bankRecipientCode) {
      return NextResponse.json(
        { success: false, error: "Bank account details are required" },
        { status: 400 },
      );
    }

    // Format check BEFORE any wallet debit — a malformed code would otherwise
    // debit the balance and only fail later at transfer time.
    if (bankRecipientCode && !isValidRecipientCode(bankRecipientCode)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid payout recipient code. Double-check the details you are paying out to; payouts sent to the wrong details cannot be recovered.",
        },
        { status: 400 },
      );
    }

    const platformConfig = await PlatformConfigService.get();
    if (amountKobo < platformConfig.wallet.minWithdrawalKobo) {
      return NextResponse.json(
        { success: false, error: `Minimum withdrawal is ${platformConfig.wallet.minWithdrawalKobo} kobo` },
        { status: 400 },
      );
    }

    const walletService = new WalletService();
    const result = await walletService.requestWithdrawal(
      session.user.id,
      amountKobo,
      hasBankAccount
        ? {
            accountNumber: bankAccount!.accountNumber!.trim(),
            bankCode: bankAccount!.bankCode!.trim(),
            accountName: bankAccount!.accountName!.trim(),
          }
        : { recipientCode: bankRecipientCode!.trim() },
    );

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    if (err instanceof Error && err.message === "Forbidden") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
