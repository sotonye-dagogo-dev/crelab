import { db } from "@/lib/db";
import { wallets, walletTransactions, processedWebhookEvents } from "@/drizzle/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { InsufficientBalanceError, DuplicateWebhookError } from "@/lib/errors";
import { PaymentProviderService } from "@/services/PaymentProviderService";
import type { PayoutDestination, PaymentProviderId } from "@/lib/payments/types";
import { AuditService } from "@/services/AuditService";
import { notifyWalletTopup, notifyWithdrawalRequested } from "@/lib/lifecycle-emails";
import type { IWallet, IWalletTransaction } from "@/types";
import { WalletTransactionType } from "@/types";
import crypto from "crypto";

/** Bank details for a payout. `recipientCode` is Paystack's legacy shortcut. */
export interface WithdrawalDestination {
  recipientCode?: string;
  accountNumber?: string;
  bankCode?: string;
  accountName?: string;
}

function toPayoutDestination(destination: WithdrawalDestination): PayoutDestination | null {
  if (destination.recipientCode) {
    return { kind: "recipient_code", code: destination.recipientCode };
  }
  if (destination.accountNumber && destination.bankCode && destination.accountName) {
    return {
      kind: "bank_account",
      account: {
        accountNumber: destination.accountNumber,
        bankCode: destination.bankCode,
        accountName: destination.accountName,
      },
    };
  }
  return null;
}

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
    provider: row.provider as PaymentProviderId,
    testMode: row.testMode,
    metadata: row.metadata as Record<string, unknown>,
    createdAt: row.createdAt.toISOString(),
  };
}

export interface IWalletService {
  getOrCreate(userId: string): Promise<IWallet>;
  getBalance(userId: string): Promise<{ balanceKobo: number; escrowKobo: number; totalEarnedKobo: number }>;
  topUpFromCard(
    userId: string,
    amountKobo: number,
    paystackRef: string,
    options?: { provider?: PaymentProviderId; testMode?: boolean },
  ): Promise<IWalletTransaction>;
  topUpFromBankTransfer(userId: string, amountKobo: number, paystackRef: string): Promise<IWalletTransaction>;
  debitForBooking(userId: string, bookingId: string, amountKobo: number, feeKobo: number): Promise<{ debit: IWalletTransaction; fee: IWalletTransaction }>;
  creditFromEscrowRelease(providerUserId: string, bookingId: string, netKobo: number, feeKobo: number): Promise<IWalletTransaction>;
  requestWithdrawal(
    userId: string,
    amountKobo: number,
    destination: WithdrawalDestination,
  ): Promise<{ transferCode: string; provider: PaymentProviderId; testMode: boolean }>;
  debitForMilestone(clientUserId: string, milestoneId: string, amountKobo: number, feeKobo: number): Promise<IWalletTransaction>;
  reverseMilestoneDebit(clientUserId: string, milestoneId: string, amountKobo: number, feeKobo: number): Promise<IWalletTransaction>;
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

  async topUpFromCard(
    userId: string,
    amountKobo: number,
    paystackRef: string,
    options: { provider?: PaymentProviderId; testMode?: boolean } = {},
  ): Promise<IWalletTransaction> {
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
      const [claimed] = await tx
        .insert(processedWebhookEvents)
        .values({
          id: crypto.randomUUID(),
          paystackRef,
          eventType: "charge.success",
        })
        .onConflictDoNothing({ target: processedWebhookEvents.paystackRef })
        .returning({ id: processedWebhookEvents.id });
      // Lost the check-then-insert race to a concurrent delivery/verify: roll
      // back our credit and surface the clean duplicate signal.
      if (!claimed) throw new DuplicateWebhookError();

      // Read the post-update balance back from the DB so `balanceAfterKobo`
      // stays truthful under concurrent credits (a pre-read would drift).
      const [updated] = await tx
        .update(wallets)
        .set({
          balanceKobo: sql`${wallets.balanceKobo} + ${amountKobo}`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, wallet.id))
        .returning({ balanceKobo: wallets.balanceKobo });

      return tx
        .insert(walletTransactions)
        .values({
          id: crypto.randomUUID(),
          walletId: wallet.id,
          type: "TOPUP_CARD",
          amountKobo,
          direction: "CREDIT",
          balanceAfterKobo: updated?.balanceKobo ?? wallet.balanceKobo + amountKobo,
          reference: ref,
          paystackRef,
          provider: options.provider ?? "PAYSTACK",
          testMode: options.testMode ?? false,
        })
        .returning();
    });

    void AuditService.log({
      userId,
      action: "wallet.topup.card",
      entity: "wallets",
      entityId: wallet.id,
      newValue: {
        amountKobo,
        paystackRef,
        reference: ref,
        provider: options.provider ?? "PAYSTACK",
        testMode: options.testMode ?? false,
      },
    }).catch(() => {});
    void notifyWalletTopup(userId, amountKobo);

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
      const [claimed] = await tx
        .insert(processedWebhookEvents)
        .values({
          id: crypto.randomUUID(),
          paystackRef,
          eventType: "charge.success",
        })
        .onConflictDoNothing({ target: processedWebhookEvents.paystackRef })
        .returning({ id: processedWebhookEvents.id });
      if (!claimed) throw new DuplicateWebhookError();

      const [updated] = await tx
        .update(wallets)
        .set({
          balanceKobo: sql`${wallets.balanceKobo} + ${amountKobo}`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, wallet.id))
        .returning({ balanceKobo: wallets.balanceKobo });

      return tx
        .insert(walletTransactions)
        .values({
          id: crypto.randomUUID(),
          walletId: wallet.id,
          type: "TOPUP_BANK",
          amountKobo,
          direction: "CREDIT",
          balanceAfterKobo: updated?.balanceKobo ?? wallet.balanceKobo + amountKobo,
          reference: ref,
          paystackRef,
          provider: "PAYSTACK",
          testMode: false,
        })
        .returning();
    });

    void AuditService.log({
      userId,
      action: "wallet.topup.bank",
      entity: "wallets",
      entityId: wallet.id,
      newValue: { amountKobo, paystackRef, reference: ref, provider: "PAYSTACK", testMode: false },
    }).catch(() => {});
    void notifyWalletTopup(userId, amountKobo);

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
      // Guarded debit: `balance >= amount` is enforced IN SQL so two concurrent
      // debits can never overdraw (the pre-read above is only a fast-fail).
      // The post-update balance is read back for an accurate ledger snapshot.
      const [updated] = await tx
        .update(wallets)
        .set({
          balanceKobo: sql`${wallets.balanceKobo} - ${amountKobo}`,
          escrowKobo: sql`${wallets.escrowKobo} + ${amountKobo - feeKobo}`,
          updatedAt: new Date(),
        })
        .where(and(eq(wallets.id, wallet.id), gte(wallets.balanceKobo, amountKobo)))
        .returning({ balanceKobo: wallets.balanceKobo });
      if (!updated) throw new InsufficientBalanceError();

      const balanceAfterDebit = updated.balanceKobo;

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

      const fee = await tx
        .insert(walletTransactions)
        .values({
          id: crypto.randomUUID(),
          walletId: wallet.id,
          type: "FEE_DEBIT",
          amountKobo: feeKobo,
          direction: "DEBIT",
          balanceAfterKobo: balanceAfterDebit,
          reference: feeRef,
          relatedBookingId: bookingId,
        })
        .returning();

      return { debit: debit[0], fee: fee[0] };
    });

    return { debit: mapTransaction(txns.debit), fee: mapTransaction(txns.fee) };
  }

  /**
   * Credit the PROVIDER on escrow release (net = amount − fee; the platform
   * keeps the fee — modelled as money that simply exits the user-ledger).
   *
   * Exactly-once: the reference is deterministic (`ESCROW-RELEASE-{bookingId}`)
   * and unique in wallet_transactions, so retries and concurrent release paths
   * (client confirm vs. cron) collapse to one credit — callers treat a unique
   * violation as "already credited".
   *
   * The client's escrowKobo is only cleared for WALLET-funded bookings, and only
   * by `netKobo` — that is exactly what `debitForBooking` parked there
   * (`amount - fee`). Card-funded bookings never touched the client wallet, so
   * clearing here would eat into the client's OTHER bookings' escrow, and
   * subtracting the fee (as an earlier draft did) over-draws the shared pool.
   * `feeKobo` is kept for call-site symmetry but deliberately not subtracted.
   */
  async creditFromEscrowRelease(providerUserId: string, bookingId: string, netKobo: number, feeKobo: number): Promise<IWalletTransaction> {
    const wallet = await this.getOrCreate(providerUserId);
    void feeKobo; // never part of the client-side escrow movement (see docblock)

    const ref = `ESCROW-RELEASE-${bookingId}`;

    // Best-effort: locate the client wallet + confirm this was wallet-funded.
    let clientWalletId: string | null = null;
    try {
      const { bookings, payments } = await import("@/drizzle/schema");
      const [bookingRow] = await db.select({ clientId: bookings.clientId }).from(bookings).where(eq(bookings.id, bookingId));
      if (bookingRow) {
        const [cWallet] = await db.select({ id: wallets.id }).from(wallets).where(eq(wallets.userId, bookingRow.clientId));
        if (cWallet) {
          const [paymentRow] = await db
            .select({ paystackRef: payments.paystackRef })
            .from(payments)
            .where(eq(payments.bookingId, bookingId))
            .limit(1);
          if (paymentRow?.paystackRef.startsWith("WALLET-")) {
            clientWalletId = cWallet.id;
          }
        }
      }
    } catch {
      // best-effort escrow clearing — never blocks the provider credit
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
        // Guard: never go negative — clamp at 0 via GREATEST. Subtract exactly
        // what debitForBooking added (net), never net + fee.
        await tx
          .update(wallets)
          .set({
            escrowKobo: sql`GREATEST(${wallets.escrowKobo} - ${netKobo}, 0)`,
            updatedAt: new Date(),
          })
          .where(eq(wallets.id, clientWalletId));
      }

      // Read back the post-update balance — a pre-read would record a wrong
      // balanceAfterKobo whenever two releases credit the same wallet.
      const [updated] = await tx
        .select({ balanceKobo: wallets.balanceKobo })
        .from(wallets)
        .where(eq(wallets.id, wallet.id));

      return tx
        .insert(walletTransactions)
        .values({
          id: crypto.randomUUID(),
          walletId: wallet.id,
          type: "ESCROW_RELEASE",
          amountKobo: netKobo,
          direction: "CREDIT",
          balanceAfterKobo: updated?.balanceKobo ?? wallet.balanceKobo + netKobo,
          reference: ref,
          relatedBookingId: bookingId,
        })
        .returning();
    });

    return mapTransaction(txn);
  }

  /**
   * Return escrow-funded money to the CLIENT's wallet (dispute refund of a
   * wallet-funded booking): restores what they paid (`amountKobo`) to their
   * balance and clears the net that `debitForBooking`/`debitForMilestone`
   * parked in escrowKobo. Deterministic reference (`ESCROW-REFUND-{bookingId}`)
   * + unique constraint = double-refund is impossible; callers treat a unique
   * violation as "already refunded".
   */
  async refundEscrowToClient(clientUserId: string, bookingId: string, amountKobo: number, netKobo: number): Promise<IWalletTransaction> {
    const wallet = await this.getOrCreate(clientUserId);
    const ref = `ESCROW-REFUND-${bookingId}`;

    const [txn] = await db.transaction(async (tx) => {
      await tx
        .update(wallets)
        .set({
          balanceKobo: sql`${wallets.balanceKobo} + ${amountKobo}`,
          escrowKobo: sql`GREATEST(${wallets.escrowKobo} - ${netKobo}, 0)`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, wallet.id));

      const [updated] = await tx
        .select({ balanceKobo: wallets.balanceKobo })
        .from(wallets)
        .where(eq(wallets.id, wallet.id));

      return tx
        .insert(walletTransactions)
        .values({
          id: crypto.randomUUID(),
          walletId: wallet.id,
          type: "REFUND",
          amountKobo,
          direction: "CREDIT",
          balanceAfterKobo: updated?.balanceKobo ?? wallet.balanceKobo + amountKobo,
          reference: ref,
          relatedBookingId: bookingId,
          metadata: { reason: "Escrow refund to client" },
        })
        .returning();
    });

    return mapTransaction(txn);
  }

  /**
   * Compensating refund for a wallet escrow debit that failed to start escrow
   * (hold race / booking left the payable state after the debit): restores the
   * full debit to the balance and the net that was parked in escrowKobo.
   * Deterministic reference keeps the compensation itself exactly-once.
   */
  async reverseBookingDebit(userId: string, bookingId: string, amountKobo: number, feeKobo: number): Promise<IWalletTransaction> {
    const wallet = await this.getOrCreate(userId);
    const netKobo = Math.max(0, amountKobo - feeKobo);
    const ref = `BOOKING-DEBIT-REVERSAL-${bookingId}`;

    const [txn] = await db.transaction(async (tx) => {
      await tx
        .update(wallets)
        .set({
          balanceKobo: sql`${wallets.balanceKobo} + ${amountKobo}`,
          escrowKobo: sql`GREATEST(${wallets.escrowKobo} - ${netKobo}, 0)`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, wallet.id));

      const [updated] = await tx
        .select({ balanceKobo: wallets.balanceKobo })
        .from(wallets)
        .where(eq(wallets.id, wallet.id));

      return tx
        .insert(walletTransactions)
        .values({
          id: crypto.randomUUID(),
          walletId: wallet.id,
          type: "REFUND",
          amountKobo,
          direction: "CREDIT",
          balanceAfterKobo: updated?.balanceKobo ?? wallet.balanceKobo + amountKobo,
          reference: ref,
          relatedBookingId: bookingId,
          metadata: { reason: "Escrow start failed after wallet debit" },
        })
        .returning();
    });

    return mapTransaction(txn);
  }

  async requestWithdrawal(
    userId: string,
    amountKobo: number,
    destination: WithdrawalDestination,
  ): Promise<{ transferCode: string; provider: PaymentProviderId; testMode: boolean }> {
    const payoutDestination = toPayoutDestination(destination);
    if (!payoutDestination) {
      throw new Error("Enter valid bank account details for this withdrawal");
    }
    const { runtime, adapter } = await PaymentProviderService.getRuntime();
    const wallet = await this.getOrCreate(userId);

    if (wallet.balanceKobo < amountKobo) {
      throw new InsufficientBalanceError();
    }

    const ref = `WITHDRAWAL-${crypto.randomUUID()}`;

    // Guarded debit (same overdraft-proof pattern as debitForBooking): the SQL
    // WHERE clause is the source of truth under concurrency.
    const balanceAfterKobo = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(wallets)
        .set({
          balanceKobo: sql`${wallets.balanceKobo} - ${amountKobo}`,
          updatedAt: new Date(),
        })
        .where(and(eq(wallets.id, wallet.id), gte(wallets.balanceKobo, amountKobo)))
        .returning({ balanceKobo: wallets.balanceKobo });
      if (!updated) throw new InsufficientBalanceError();

      await tx
        .insert(walletTransactions)
        .values({
          id: crypto.randomUUID(),
          walletId: wallet.id,
          type: "WITHDRAWAL",
          amountKobo,
          direction: "DEBIT",
          balanceAfterKobo: updated.balanceKobo,
          reference: ref,
          provider: runtime.provider,
          testMode: runtime.testMode,
        });

      return updated.balanceKobo;
    });

    try {
      const transferResult = await adapter.payout(
        { amountKobo, reference: ref, destination: payoutDestination },
        runtime.testMode,
      );

      void AuditService.log({
        userId,
        action: "wallet.withdrawal.requested",
        entity: "wallets",
        entityId: wallet.id,
        newValue: {
          amountKobo,
          transferCode: transferResult.transferCode,
          reference: ref,
          provider: runtime.provider,
          testMode: runtime.testMode,
          fallbackFrom: runtime.fallbackFrom,
        },
      }).catch(() => {});
      void notifyWithdrawalRequested(userId, amountKobo);

      return {
        transferCode: transferResult.transferCode,
        provider: runtime.provider,
        testMode: runtime.testMode,
      };
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

    const [txn] = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(wallets)
        .set({
          balanceKobo: sql`${wallets.balanceKobo} - ${amountKobo}`,
          escrowKobo: sql`${wallets.escrowKobo} + ${amountKobo - feeKobo}`,
          updatedAt: new Date(),
        })
        .where(and(eq(wallets.id, wallet.id), gte(wallets.balanceKobo, amountKobo)))
        .returning({ balanceKobo: wallets.balanceKobo });
      if (!updated) throw new InsufficientBalanceError();

      return tx
        .insert(walletTransactions)
        .values({
          id: crypto.randomUUID(),
          walletId: wallet.id,
          type: "MILESTONE_DEBIT",
          amountKobo,
          direction: "DEBIT",
          balanceAfterKobo: updated.balanceKobo,
          reference: ref,
          relatedMilestoneId: milestoneId,
        })
        .returning();
    });

    return mapTransaction(txn);
  }

  /**
   * Compensating refund for a milestone debit whose status flip lost the race
   * (or failed) — restores the balance and clears the escrow that
   * `debitForMilestone` parked. Deterministic reference keeps the compensation
   * itself exactly-once.
   */
  async reverseMilestoneDebit(clientUserId: string, milestoneId: string, amountKobo: number, feeKobo: number): Promise<IWalletTransaction> {
    const wallet = await this.getOrCreate(clientUserId);
    const netKobo = Math.max(0, amountKobo - feeKobo);
    const ref = `MILESTONE-DEBIT-REVERSAL-${milestoneId}`;

    const [txn] = await db.transaction(async (tx) => {
      await tx
        .update(wallets)
        .set({
          balanceKobo: sql`${wallets.balanceKobo} + ${amountKobo}`,
          escrowKobo: sql`GREATEST(${wallets.escrowKobo} - ${netKobo}, 0)`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, wallet.id));

      const [updated] = await tx
        .select({ balanceKobo: wallets.balanceKobo })
        .from(wallets)
        .where(eq(wallets.id, wallet.id));

      return tx
        .insert(walletTransactions)
        .values({
          id: crypto.randomUUID(),
          walletId: wallet.id,
          type: "REFUND",
          amountKobo,
          direction: "CREDIT",
          balanceAfterKobo: updated?.balanceKobo ?? wallet.balanceKobo + amountKobo,
          reference: ref,
          relatedMilestoneId: milestoneId,
          metadata: { reason: "Milestone fund flip failed — debit reversed" },
        })
        .returning();
    });

    return mapTransaction(txn);
  }

  /**
   * Credit the PROVIDER when a milestone is approved. Exactly-once: the
   * reference is deterministic (`MILESTONE-RELEASE-{milestoneId}`, unique in
   * wallet_transactions) so retries, double-clicks and the cron auto-approve
   * overlapping a client approval all collapse to one credit — callers treat a
   * unique violation as "already credited" (same pattern as escrow release).
   */
  async creditMilestoneRelease(providerUserId: string, milestoneId: string, netKobo: number, feeKobo: number): Promise<IWalletTransaction> {
    const wallet = await this.getOrCreate(providerUserId);
    void feeKobo; // never part of the client-side escrow movement (see subtraction note below)

    const ref = `MILESTONE-RELEASE-${milestoneId}`;

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
        // Subtract exactly what debitForMilestone parked (`amount - fee` = net),
        // never net + fee — the fee was debited from balance directly and never
        // entered escrowKobo, so including it over-draws the shared escrow pool
        // whenever the client has other bookings in escrow.
        await tx
          .update(wallets)
          .set({
            escrowKobo: sql`GREATEST(${wallets.escrowKobo} - ${netKobo}, 0)`,
            updatedAt: new Date(),
          })
          .where(eq(wallets.id, clientWalletId));
      }

      // Read back the post-update balance — a pre-read would record a wrong
      // balanceAfterKobo whenever two credits land concurrently.
      const [updated] = await tx
        .select({ balanceKobo: wallets.balanceKobo })
        .from(wallets)
        .where(eq(wallets.id, wallet.id));

      return tx
        .insert(walletTransactions)
        .values({
          id: crypto.randomUUID(),
          walletId: wallet.id,
          type: "MILESTONE_RELEASE",
          amountKobo: netKobo,
          direction: "CREDIT",
          balanceAfterKobo: updated?.balanceKobo ?? wallet.balanceKobo + netKobo,
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
      // Guarded client debit — concurrent direct payments can never overdraw.
      const [clientUpdated] = await tx
        .update(wallets)
        .set({
          balanceKobo: sql`${wallets.balanceKobo} - ${amountKobo}`,
          updatedAt: new Date(),
        })
        .where(and(eq(wallets.id, clientWallet.id), gte(wallets.balanceKobo, amountKobo)))
        .returning({ balanceKobo: wallets.balanceKobo });
      if (!clientUpdated) throw new InsufficientBalanceError();

      const [providerUpdated] = await tx
        .update(wallets)
        .set({
          balanceKobo: sql`${wallets.balanceKobo} + ${amountKobo - feeKobo}`,
          totalEarnedKobo: sql`${wallets.totalEarnedKobo} + ${amountKobo - feeKobo}`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, providerWallet.id))
        .returning({ balanceKobo: wallets.balanceKobo });

      const balanceAfterClientDebit = clientUpdated.balanceKobo;
      const balanceAfterProviderCredit =
        providerUpdated?.balanceKobo ?? providerWallet.balanceKobo + (amountKobo - feeKobo);

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
