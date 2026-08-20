import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/paystack";
import { DuplicateWebhookError } from "@/lib/errors";
import { EscrowService } from "@/services/EscrowService";
import { WalletService } from "@/services/WalletService";
import { db } from "@/lib/db";
import { wallets, processedWebhookEvents, walletTransactions } from "@/drizzle/schema";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    console.error("[paystack-webhook] PAYSTACK_SECRET_KEY not configured");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const isValid = verifyWebhookSignature(rawBody, signature, secretKey);
  if (!isValid) {
    console.warn(
      "[paystack-webhook] Invalid signature received",
      JSON.stringify({ signature }),
    );
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let event: {
    event: string;
    data: Record<string, unknown>;
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event.event === "charge.success") {
    const data = event.data as Record<string, unknown>;
    const metadata = (data.metadata ?? {}) as Record<string, unknown>;
    const ref = data.reference as string;
    const amount = data.amount as number;

    if (metadata.purpose === "WALLET_TOPUP") {
      const userId = metadata.userId as string;

      const [existing] = await db
        .select()
        .from(processedWebhookEvents)
        .where(eq(processedWebhookEvents.paystackRef, ref));

      if (existing) {
        return NextResponse.json({ success: true, status: "duplicate" });
      }

      const walletService = new WalletService();
      try {
        await walletService.topUpFromCard(userId, amount, ref);
      } catch (err) {
        // The post-payment callback page may already have credited this ref
        // (see /api/wallet/topup/verify). A duplicate here is a success, not an
        // error — never surface a 500 for an already-processed payment.
        if (err instanceof DuplicateWebhookError) {
          return NextResponse.json({ success: true, status: "duplicate" });
        }
        throw err;
      }

      return NextResponse.json({ success: true });
    }

    if (metadata.purpose === "BOOKING_PAYMENT") {
      const [existing] = await db
        .select()
        .from(processedWebhookEvents)
        .where(eq(processedWebhookEvents.paystackRef, ref));

      if (existing) {
        return NextResponse.json({ success: true, status: "duplicate" });
      }

      await db.insert(processedWebhookEvents).values({
        id: crypto.randomUUID(),
        paystackRef: ref,
        eventType: "charge.success",
      });

      const escrowService = new EscrowService();
      await escrowService.onPaystackSuccess(ref);

      return NextResponse.json({ success: true });
    }

    const [existing] = await db
      .select()
      .from(processedWebhookEvents)
      .where(eq(processedWebhookEvents.paystackRef, ref));

    if (existing) {
      return NextResponse.json({ success: true, status: "duplicate" });
    }

    await db.insert(processedWebhookEvents).values({
      id: crypto.randomUUID(),
      paystackRef: ref,
      eventType: "charge.success",
    });

    const escrowService = new EscrowService();
    escrowService.onPaystackSuccess(ref).catch((err) => {
      console.error(
        `[paystack-webhook] Error processing charge.success for ref ${ref}:`,
        err,
      );
    });

    return NextResponse.json({ success: true });
  }

  if (event.event === "transfer.success") {
    const data = event.data as Record<string, unknown>;
    const transferRef = data.reference as string;
    const transferCode = data.transfer_code as string;

    const paystackRef = transferRef ?? transferCode;

    const [existing] = await db
      .select()
      .from(processedWebhookEvents)
      .where(eq(processedWebhookEvents.paystackRef, paystackRef));

    if (existing) {
      return NextResponse.json({ success: true, status: "duplicate" });
    }

    await db.insert(processedWebhookEvents).values({
      id: crypto.randomUUID(),
      paystackRef,
      eventType: "transfer.success",
    });

    return NextResponse.json({ success: true });
  }

  if (event.event === "transfer.failed" || event.event === "transfer.reversed") {
    const data = event.data as Record<string, unknown>;
    const transferRef = data.reference as string;
    const transferCode = data.transfer_code as string;
    const paystackRef = transferRef ?? transferCode;

    const [existing] = await db
      .select()
      .from(processedWebhookEvents)
      .where(eq(processedWebhookEvents.paystackRef, paystackRef));

    if (existing) {
      return NextResponse.json({ success: true, status: "duplicate" });
    }

    await db.insert(processedWebhookEvents).values({
      id: crypto.randomUUID(),
      paystackRef,
      eventType: event.event,
    });

    const [withdrawalTxn] = await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.reference, paystackRef));

    if (withdrawalTxn) {
      await db.transaction(async (tx) => {
        const refundRef = `REFUND-${crypto.randomUUID()}`;

        await tx
          .update(wallets)
          .set({
            balanceKobo: sql`${wallets.balanceKobo} + ${withdrawalTxn.amountKobo}`,
            updatedAt: new Date(),
          })
          .where(eq(wallets.id, withdrawalTxn.walletId));

        const [updatedWallet] = await tx
          .select()
          .from(wallets)
          .where(eq(wallets.id, withdrawalTxn.walletId));

        await tx.insert(walletTransactions).values({
          id: crypto.randomUUID(),
          walletId: withdrawalTxn.walletId,
          type: "REFUND",
          amountKobo: withdrawalTxn.amountKobo,
          direction: "CREDIT",
          balanceAfterKobo: updatedWallet.balanceKobo,
          reference: refundRef,
          metadata: {
            originalWithdrawalReference: paystackRef,
            reason: event.event === "transfer.failed" ? "Transfer failed" : "Transfer reversed",
          },
        });
      });
    }

    return NextResponse.json({ success: true });
  }

  if (event.event === "dedicatedaccount.assign.success") {
    const data = event.data as Record<string, unknown>;
    const customer = data.customer as Record<string, unknown> | undefined;
    const dedicatedAccount = data.dedicated_account as Record<string, unknown> | undefined;

    if (customer?.id && dedicatedAccount) {
      const userId = customer.id as string;

      await db
        .update(wallets)
        .set({
          dvaAccountNumber: (dedicatedAccount.account_number as string) ?? null,
          dvaBankName: ((dedicatedAccount.bank as Record<string, unknown>)?.name as string) ?? null,
          updatedAt: new Date(),
        })
        .where(eq(wallets.userId, userId));
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: true });
}
