import { db } from "@/lib/db";
import { wallets, walletTransactions, processedWebhookEvents } from "@/drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { InsufficientBalanceError, DuplicateWebhookError } from "@/lib/errors";
import { initiateTransfer } from "@/lib/paystack";
import type { IWallet, IWalletTransaction } from "@/types";
import { WalletTransactionType } from "@/types";
import crypto from "crypto";

function mapWallet(row: typeof wallets.$inferSelect): IWallet {
  return {
    id: row.id,
    userId: row.userId,
    balanceKobo: row.balanceKobo,
    escrowKobo: row.escrowKobo,
    totalEarnedKobo: row.totalEarnedKobo,
    dvaAccountNumber: row.dvaAccountNumber ?? undefined,
    dvaBankName: row.dvaBankName ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapTransaction(row: typeof walletTransactions.$inferSelect): IWalletTransaction {
  return {
    id: row.id,
    walletId: row.walletId,
    type: row.type as WalletTransactionType,
    amountKobo: row.amountKobo,
    direction: row.direction as "CREDIT" | "DEBIT",
    balanceAfterKobo: row.balanceAfterKobo,
    reference: row.reference,
    relatedBookingId: row.relatedBookingId ?? undefined,
    relatedMilestoneId: row.relatedMilestoneId ?? undefined,
    paystackRef: row.paystackRef ?? undefined,
    metadata: row.metadata as Record<string, unknown>,
    createdAt: row.createdAt.toISOString(),
  };
}

export interface IWalletService {
  getOrCreate(userId: string): Promise<IWallet>;
  getBalance(userId: string): Promise<{ balanceKobo: number; escrowKobo: number; totalEarnedKobo: number }>;
  topUpFromCard(userId: string, amountKobo: number, paystackRef: string): Promise<IWalletTransaction>;
  topUpFromBankTransfer(userId: string, amountKobo: number, paystackRef: string): Promise<IWalletTransaction>;
  debitForBooking(userId: string, bookingId: string, amountKobo: number, feeKobo: number): Promise<{ debit: IWalletTransaction; fee: IWalletTransaction }>;
  creditFromEscrowRelease(providerUserId: string, bookingId: string, netKobo: number, feeKobo: number): Promise<IWalletTransaction>;
  requestWithdrawal(userId: string, amountKobo: number, bankRecipientCode: string): Promise<{ transferCode: string }>;
  debitForMilestone(clientUserId: string, milestoneId: string, amountKobo: number, feeKobo: number): Promise<IWalletTransaction>;
  creditMilestoneRelease(providerUserId: string, milestoneId: string, netKobo: number, feeKobo: number): Promise<IWalletTransaction>;
  debitForDirectPayment(clientUserId: string, providerUserId: string, amountKobo: number, feeKobo: number, bookingId: string): Promise<{ clientDebit: IWalletTransaction; providerCredit: IWalletTransaction; feeDebit: IWalletTransaction }>;
}

export class WalletService implements IWalletService {
  async getOrCreate(userId: string): Promise<IWallet> {
    const [existing] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, userId));

    if (existing) return mapWallet(existing);

    const [created] = await db
      .insert(wallets)
      .values({
        id: crypto.randomUUID(),
        userId,
        balanceKobo: 0,
        escrowKobo: 0,
        totalEarnedKobo: 0,
      })
      .returning();

    return mapWallet(created);
  }

  async getBalance(userId: string): Promise<{ balanceKobo: number; escrowKobo: number; totalEarnedKobo: number }> {
    const wallet = await this.getOrCreate(userId);
    return {
      balanceKobo: wallet.balanceKobo,
      escrowKobo: wallet.escrowKobo,
      totalEarnedKobo: wallet.totalEarnedKobo,
    };
  }

  async topUpFromCard(userId: string, amountKobo: number, paystackRef: string): Promise<IWalletTransaction> {
    const [existing] = await db
      .select()
      .from(processedWebhookEvents)
      .where(eq(processedWebhookEvents.paystackRef, paystackRef));

    if (existing) {
      const [txn] = await db
        .select()
        .from(walletTransactions)
        .where(eq(walletTransactions.paystackRef, paystackRef));
      if (txn) return mapTransaction(txn);
      throw new DuplicateWebhookError();
    }

    const wallet = await this.getOrCreate(userId);

    const ref = `WALLET-TOPUP-CARD-${crypto.randomUUID()}`;

    const [txn] = await db.transaction(async (tx) => {
      await tx.insert(processedWebhookEvents).values({
        id: crypto.randomUUID(),
        paystackRef,
        eventType: "charge.success",
      });

      const balanceAfterKobo = wallet.balanceKobo + amountKobo;

      await tx
        .update(wallets)
        .set({
          balanceKobo: sql`${wallets.balanceKobo} + ${amountKobo}`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, wallet.id));

      return tx
        .insert(walletTransactions)
        .values({
          id: crypto.randomUUID(),
          walletId: wallet.id,
          type: "TOPUP_CARD",
          amountKobo,
          direction: "CREDIT",
          balanceAfterKobo,
          reference: ref,
          paystackRef,
        })
        .returning();
    });

    return mapTransaction(txn);
  }

  async topUpFromBankTransfer(userId: string, amountKobo: number, paystackRef: string): Promise<IWalletTransaction> {
    const [existing] = await db
      .select()
      .from(processedWebhookEvents)
      .where(eq(processedWebhookEvents.paystackRef, paystackRef));

    if (existing) {
      const [txn] = await db
        .select()
        .from(walletTransactions)
        .where(eq(walletTransactions.paystackRef, paystackRef));
      if (txn) return mapTransaction(txn);
      throw new DuplicateWebhookError();
    }

    const wallet = await this.getOrCreate(userId);

    const ref = `WALLET-TOPUP-BANK-${crypto.randomUUID()}`;

    const [txn] = await db.transaction(async (tx) => {
      await tx.insert(processedWebhookEvents).values({
        id: crypto.randomUUID(),
        paystackRef,
        eventType: "charge.success",
      });

      const balanceAfterKobo = wallet.balanceKobo + amountKobo;

      await tx
        .update(wallets)
        .set({
          balanceKobo: sql`${wallets.balanceKobo} + ${amountKobo}`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, wallet.id));

      return tx
        .insert(walletTransactions)
        .values({
          id: crypto.randomUUID(),
          walletId: wallet.id,
          type: "TOPUP_BANK",
          amountKobo,
          direction: "CREDIT",
          balanceAfterKobo,
          reference: ref,
          paystackRef,
        })
        .returning();
    });

    return mapTransaction(txn);
  }

  async debitForBooking(userId: string, bookingId: string, amountKobo: number, feeKobo: number): Promise<{ debit: IWalletTransaction; fee: IWalletTransaction }> {
    const wallet = await this.getOrCreate(userId);

    if (wallet.balanceKobo < amountKobo) {
      throw new InsufficientBalanceError();
    }

    const debitRef = `BOOKING-DEBIT-${crypto.randomUUID()}`;
    const feeRef = `BOOKING-FEE-${crypto.randomUUID()}`;

    const txns = await db.transaction(async (tx) => {
      const balanceAfterDebit = wallet.balanceKobo - amountKobo;
      const escrowAfter = wallet.escrowKobo + (amountKobo - feeKobo);

      await tx
        .update(wallets)
        .set({
          balanceKobo: sql`${wallets.balanceKobo} - ${amountKobo}`,
          escrowKobo: sql`${wallets.escrowKobo} + ${amountKobo - feeKobo}`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, wallet.id));

      const debit = await tx
        .insert(walletTransactions)
        .values({
          id: crypto.randomUUID(),
          walletId: wallet.id,
          type: "BOOKING_DEBIT",
          amountKobo,
          direction: "DEBIT",
          balanceAfterKobo: balanceAfterDebit,
          reference: debitRef,
          relatedBookingId: bookingId,
        })
        .returning();

      const feeBalanceAfterKobo = balanceAfterDebit;

      const fee = await tx
        .insert(walletTransactions)
        .values({
          id: crypto.randomUUID(),
          walletId: wallet.id,
          type: "FEE_DEBIT",
          amountKobo: feeKobo,
          direction: "DEBIT",
          balanceAfterKobo: feeBalanceAfterKobo,
          reference: feeRef,
          relatedBookingId: bookingId,
        })
        .returning();

      return { debit: debit[0], fee: fee[0] };
    });

    return { debit: mapTransaction(txns.debit), fee: mapTransaction(txns.fee) };
  }

  async creditFromEscrowRelease(providerUserId: string, bookingId: string, netKobo: number, feeKobo: number): Promise<IWalletTransaction> {
    const wallet = await this.getOrCreate(providerUserId);

    const ref = `ESCROW-RELEASE-${crypto.randomUUID()}`;

    // If this release corresponds to a wallet-funded booking, also clear the client's escrow balance atomically
    let clientWalletId: string | null = null;
    try {
      const { bookings } = await import("@/drizzle/schema");
      const [bookingRow] = await db.select({ clientId: bookings.clientId }).from(bookings).where(eq(bookings.id, bookingId));
      if (bookingRow) {
        const [cWallet] = await db.select({ id: wallets.id }).from(wallets).where(eq(wallets.userId, bookingRow.clientId));
        if (cWallet) clientWalletId = cWallet.id;
      }
    } catch {
      // best-effort escrow clearing
    }

    const [txn] = await db.transaction(async (tx) => {
      await tx
        .update(wallets)
        .set({
          balanceKobo: sql`${wallets.balanceKobo} + ${netKobo}`,
          totalEarnedKobo: sql`${wallets.totalEarnedKobo} + ${netKobo}`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, wallet.id));

      if (clientWalletId) {
        // Guard: never go negative — clamp at 0 via GREATEST
        await tx
          .update(wallets)
          .set({
            escrowKobo: sql`GREATEST(${wallets.escrowKobo} - ${netKobo + feeKobo}, 0)`,
            updatedAt: new Date(),
          })
          .where(eq(wallets.id, clientWalletId));
      }

      const balanceAfterKobo = wallet.balanceKobo + netKobo;

      return tx
        .insert(walletTransactions)
        .values({
          id: crypto.randomUUID(),
          walletId: wallet.id,
          type: "ESCROW_RELEASE",
          amountKobo: netKobo,
          direction: "CREDIT",
          balanceAfterKobo,
          reference: ref,
          relatedBookingId: bookingId,
        })
        .returning();
    });

    return mapTransaction(txn);
  }

  async requestWithdrawal(userId: string, amountKobo: number, bankRecipientCode: string): Promise<{ transferCode: string }> {
    const wallet = await this.getOrCreate(userId);

    if (wallet.balanceKobo < amountKobo) {
      throw new InsufficientBalanceError();
    }

    const ref = `WITHDRAWAL-${crypto.randomUUID()}`;
    const balanceAfterKobo = wallet.balanceKobo - amountKobo;

    const [txn] = await db.transaction(async (tx) => {
      await tx
        .update(wallets)
        .set({
          balanceKobo: sql`${wallets.balanceKobo} - ${amountKobo}`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, wallet.id));

      return tx
        .insert(walletTransactions)
        .values({
          id: crypto.randomUUID(),
          walletId: wallet.id,
          type: "WITHDRAWAL",
          amountKobo,
          direction: "DEBIT",
          balanceAfterKobo,
          reference: ref,
        })
        .returning();
    });

    try {
      const transferResult = await initiateTransfer(amountKobo, bankRecipientCode, ref);

      return { transferCode: transferResult.transferCode };
    } catch (err) {
      await db.transaction(async (tx) => {
        await tx
          .update(wallets)
          .set({
            balanceKobo: sql`${wallets.balanceKobo} + ${amountKobo}`,
            updatedAt: new Date(),
          })
          .where(eq(wallets.id, wallet.id));

        await tx
          .insert(walletTransactions)
          .values({
            id: crypto.randomUUID(),
            walletId: wallet.id,
            type: "REFUND",
            amountKobo,
            direction: "CREDIT",
            balanceAfterKobo: balanceAfterKobo + amountKobo,
            reference: `WITHDRAWAL-REFUND-${crypto.randomUUID()}`,
            metadata: { withdrawalReference: ref, error: err instanceof Error ? err.message : "Unknown" },
          });
      });

      throw err;
    }
  }

  async debitForMilestone(clientUserId: string, milestoneId: string, amountKobo: number, feeKobo: number): Promise<IWalletTransaction> {
    const wallet = await this.getOrCreate(clientUserId);

    if (wallet.balanceKobo < amountKobo) {
      throw new InsufficientBalanceError();
    }

    const ref = `MILESTONE-DEBIT-${crypto.randomUUID()}`;
    const balanceAfterKobo = wallet.balanceKobo - amountKobo;

    const [txn] = await db.transaction(async (tx) => {
      await tx
        .update(wallets)
        .set({
          balanceKobo: sql`${wallets.balanceKobo} - ${amountKobo}`,
          escrowKobo: sql`${wallets.escrowKobo} + ${amountKobo - feeKobo}`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, wallet.id));

      return tx
        .insert(walletTransactions)
        .values({
          id: crypto.randomUUID(),
          walletId: wallet.id,
          type: "MILESTONE_DEBIT",
          amountKobo,
          direction: "DEBIT",
          balanceAfterKobo,
          reference: ref,
          relatedMilestoneId: milestoneId,
        })
        .returning();
    });

    return mapTransaction(txn);
  }

  async creditMilestoneRelease(providerUserId: string, milestoneId: string, netKobo: number, feeKobo: number): Promise<IWalletTransaction> {
    const wallet = await this.getOrCreate(providerUserId);

    const ref = `MILESTONE-RELEASE-${crypto.randomUUID()}`;
    const balanceAfterKobo = wallet.balanceKobo + netKobo;

    // Also clear client escrow for wallet-funded milestones
    let clientWalletId: string | null = null;
    try {
      const { bookingMilestones } = await import("@/drizzle/schema");
      const [ms] = await db.select({ bookingId: bookingMilestones.bookingId }).from(bookingMilestones).where(eq(bookingMilestones.id, milestoneId));
      if (ms) {
        const { bookings } = await import("@/drizzle/schema");
        const [bk] = await db.select({ clientId: bookings.clientId }).from(bookings).where(eq(bookings.id, ms.bookingId));
        if (bk) {
          const [cw] = await db.select({ id: wallets.id }).from(wallets).where(eq(wallets.userId, bk.clientId));
          if (cw) clientWalletId = cw.id;
        }
      }
    } catch {
      // best-effort
    }

    const [txn] = await db.transaction(async (tx) => {
      await tx
        .update(wallets)
        .set({
          balanceKobo: sql`${wallets.balanceKobo} + ${netKobo}`,
          totalEarnedKobo: sql`${wallets.totalEarnedKobo} + ${netKobo}`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, wallet.id));

      if (clientWalletId) {
        await tx
          .update(wallets)
          .set({
            escrowKobo: sql`GREATEST(${wallets.escrowKobo} - ${netKobo + feeKobo}, 0)`,
            updatedAt: new Date(),
          })
          .where(eq(wallets.id, clientWalletId));
      }

      return tx
        .insert(walletTransactions)
        .values({
          id: crypto.randomUUID(),
          walletId: wallet.id,
          type: "MILESTONE_RELEASE",
          amountKobo: netKobo,
          direction: "CREDIT",
          balanceAfterKobo,
          reference: ref,
          relatedMilestoneId: milestoneId,
        })
        .returning();
    });

    return mapTransaction(txn);
  }

  async debitForDirectPayment(clientUserId: string, providerUserId: string, amountKobo: number, feeKobo: number, bookingId: string): Promise<{ clientDebit: IWalletTransaction; providerCredit: IWalletTransaction; feeDebit: IWalletTransaction }> {
    const clientWallet = await this.getOrCreate(clientUserId);
    const providerWallet = await this.getOrCreate(providerUserId);

    if (clientWallet.balanceKobo < amountKobo) {
      throw new InsufficientBalanceError();
    }

    const clientRef = `DIRECT-DEBIT-${crypto.randomUUID()}`;
    const providerRef = `DIRECT-CREDIT-${crypto.randomUUID()}`;
    const feeRef = `DIRECT-FEE-${crypto.randomUUID()}`;

    const txns = await db.transaction(async (tx) => {
      const balanceAfterClientDebit = clientWallet.balanceKobo - amountKobo;
      const balanceAfterProviderCredit = providerWallet.balanceKobo + (amountKobo - feeKobo);

      await tx
        .update(wallets)
        .set({
          balanceKobo: sql`${wallets.balanceKobo} - ${amountKobo}`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, clientWallet.id));

      await tx
        .update(wallets)
        .set({
          balanceKobo: sql`${wallets.balanceKobo} + ${amountKobo - feeKobo}`,
          totalEarnedKobo: sql`${wallets.totalEarnedKobo} + ${amountKobo - feeKobo}`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, providerWallet.id));

      const clientDebit = await tx
        .insert(walletTransactions)
        .values({
          id: crypto.randomUUID(),
          walletId: clientWallet.id,
          type: "DIRECT_PAYMENT_DEBIT",
          amountKobo,
          direction: "DEBIT",
          balanceAfterKobo: balanceAfterClientDebit,
          reference: clientRef,
          relatedBookingId: bookingId,
        })
        .returning();

      const providerCredit = await tx
        .insert(walletTransactions)
        .values({
          id: crypto.randomUUID(),
          walletId: providerWallet.id,
          type: "DIRECT_PAYMENT_CREDIT",
          amountKobo: amountKobo - feeKobo,
          direction: "CREDIT",
          balanceAfterKobo: balanceAfterProviderCredit,
          reference: providerRef,
          relatedBookingId: bookingId,
        })
        .returning();

      const fee = await tx
        .insert(walletTransactions)
        .values({
          id: crypto.randomUUID(),
          walletId: clientWallet.id,
          type: "FEE_DEBIT",
          amountKobo: feeKobo,
          direction: "DEBIT",
          balanceAfterKobo: balanceAfterClientDebit,
          reference: feeRef,
          relatedBookingId: bookingId,
        })
        .returning();

      return { clientDebit: clientDebit[0], providerCredit: providerCredit[0], feeDebit: fee[0] };
    });

    return {
      clientDebit: mapTransaction(txns.clientDebit),
      providerCredit: mapTransaction(txns.providerCredit),
      feeDebit: mapTransaction(txns.feeDebit),
    };
  }
}
