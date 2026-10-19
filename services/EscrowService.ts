import { db } from "@/lib/db";
import { bookings, payments, disputes } from "@/drizzle/schema";
import { eq, and, lt, gte, isNull, or } from "drizzle-orm";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { WalletService } from "@/services/WalletService";
import { initTransaction, refund } from "@/lib/paystack";
import {
  EscrowState,
  BookingStatus,
} from "@/types";
import type {
  IBooking,
  IPayment,
  IDispute,
} from "@/types";
import { BookingService, validateTransition } from "@/services/BookingService";

export const LEGAL_ESCROW_TRANSITIONS: Record<EscrowState, EscrowState[]> = {
  [EscrowState.PENDING]: [EscrowState.HELD],
  [EscrowState.HELD]: [EscrowState.IN_PROGRESS, EscrowState.REFUNDED],
  [EscrowState.IN_PROGRESS]: [EscrowState.RELEASED, EscrowState.DISPUTED],
  [EscrowState.DISPUTED]: [EscrowState.RELEASED, EscrowState.REFUNDED],
  [EscrowState.RELEASED]: [],
  [EscrowState.REFUNDED]: [],
};

/**
 * Escrow release deadline = service date (or "now" when missing/unparseable) +
 * the admin-configured escrow window. Single source of truth for every place
 * that used to inline this maths (card payment, wallet payment, cron release,
 * dispute checks) so the admin's configured window applies everywhere.
 */
export function computeEscrowReleaseDeadline(
  serviceDate: Date | string | null | undefined,
  escrowReleaseDays: number,
): Date {
  const base = serviceDate ? new Date(serviceDate) : new Date();
  const safeBase = Number.isNaN(base.getTime()) ? new Date() : base;
  const days =
    Number.isFinite(escrowReleaseDays) && escrowReleaseDays >= 0
      ? Math.trunc(escrowReleaseDays)
      : 0;
  const deadline = new Date(safeBase);
  deadline.setDate(deadline.getDate() + days);
  return deadline;
}

/**
 * Postgres unique_violation (23505) — the "already done" signal for
 * deterministic-reference writes (our exactly-once idempotency mechanism).
 */
export function isUniqueViolation(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const code = (err as { code?: unknown }).code;
  if (code === "23505") return true;
  return String((err as Error).message ?? "").toLowerCase().includes("duplicate key");
}

function mapPayment(row: typeof payments.$inferSelect): IPayment {
  return {
    id: row.id,
    bookingId: row.bookingId,
    amount: row.amount,
    fee: row.fee,
    netAmount: row.netAmount,
    paystackRef: row.paystackRef,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapDispute(row: typeof disputes.$inferSelect): IDispute {
  return {
    id: row.id,
    bookingId: row.bookingId,
    raisedById: row.raisedById,
    reason: row.reason,
    outcome: row.outcome as IDispute["outcome"],
    adminNotes: row.adminNotes,
    resolvedById: row.resolvedById,
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
  };
}

export interface IEscrowService {
  initiate(bookingId: string): Promise<{
    authorizationUrl: string;
    accessCode: string;
    reference: string;
  }>;
  /** Finalize a verified Paystack charge into escrow HELD. Idempotent; returns true when this call started escrow. */
  onPaystackSuccess(reference: string): Promise<boolean>;
  /** Exactly-once ACCEPTED→HELD transition + payment-row creation. Returns true when this call held the funds. */
  holdBookingFunds(bookingId: string, paystackRef: string, releaseDeadline: Date): Promise<boolean>;
  /**
   * Provider (or admin) marks a paid booking as started: conditional HELD→IN_PROGRESS.
   * No money moves — settlement still only happens through settleRelease/refundBookingFunds.
   */
  startBooking(bookingId: string): Promise<IBooking>;
  /** Pay the provider out of held funds (exactly once — see settleRelease). */
  settleRelease(bookingId: string): Promise<void>;
  /** Return held funds to the payer (exactly once — see refundBookingFunds). */
  refundBookingFunds(bookingId: string): Promise<void>;
  setInProgress(): Promise<{ processed: number; errors: string[] }>;
  clientConfirmRelease(bookingId: string, clientId: string): Promise<IBooking>;
  autoRelease(): Promise<{ processed: number; errors: string[] }>;
  raiseDispute(
    bookingId: string,
    clientId: string,
    reason: string,
  ): Promise<IDispute>;
  resolveDispute(
    disputeId: string,
    adminId: string,
    outcome: "RELEASED" | "REFUNDED",
    adminNotes?: string,
  ): Promise<IDispute>;
}

export class EscrowService implements IEscrowService {
  async initiate(bookingId: string) {
    const booking = await new BookingService().getById(bookingId);
    if (!booking) throw new Error("Booking not found");
    if (booking.status !== "ACCEPTED")
      throw new Error("Booking must be ACCEPTED before payment");

    const ref = `CRELLAB-${booking.id}-${Date.now()}`;

    // Use real client email for Paystack receipt + webhook attribution; fallback only for missing email
    const { user } = await import("@/drizzle/schema");
    const [client] = await db.select({ email: user.email }).from(user).where(eq(user.id, booking.clientId));
    const clientEmail = client?.email ?? "payment@crellab.app";

    // Redirect fallback (used when the inline popup is unavailable) lands on the
    // bookings list, where status is rendered server-side — a truthful end state
    // either way (the webhook remains the primary finalizer).
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
    const result = await initTransaction(
      booking.total,
      clientEmail,
      ref,
      {
        metadata: { purpose: "BOOKING_PAYMENT", bookingId, clientId: booking.clientId, providerId: booking.providerId },
        callbackUrl: appUrl ? `${appUrl}/bookings` : undefined,
      },
    );

    await db
      .update(bookings)
      .set({
        paystackRef: ref,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId));

    return result;
  }

  /**
   * Finalize a successful Paystack charge into escrow HELD. Idempotent on
   * purpose — the webhook AND the client-side verify endpoint may both run it:
   * a payment row already carrying this reference means the money is already
   * held (skip), and a booking that left the payable state needs a manual
   * refund instead of silently being resurrected.
   * Returns true only when this call started escrow.
   */
  async onPaystackSuccess(reference: string): Promise<boolean> {
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.paystackRef, reference));

    if (!booking) throw new Error(`No booking found for ref ${reference}`);

    const [existingPayment] = await db
      .select({ id: payments.id })
      .from(payments)
      .where(eq(payments.paystackRef, reference))
      .limit(1);
    if (existingPayment) return false; // duplicate webhook/verify — already held

    if (booking.status !== "ACCEPTED") {
      console.error(
        `[escrow] charge.success ref=${reference} for booking ${booking.id} (status=${booking.status}) cannot be held — manual refund review required`,
      );
      return false;
    }

    const platformConfig = await PlatformConfigService.get();
    const releaseDeadline = computeEscrowReleaseDeadline(
      booking.serviceDate,
      platformConfig.escrowReleaseDays,
    );

    const held = await this.holdBookingFunds(booking.id, reference, releaseDeadline);
    if (!held) {
      console.error(
        `[escrow] charge.success ref=${reference}: booking ${booking.id} left the payable state before hold — no payment row created (manual review)`,
      );
    }
    return held;
  }

  /**
   * Exactly-once ACCEPTED→HELD transition + payment-row creation in a single
   * transaction. The conditional `status = 'ACCEPTED'` guard makes concurrent
   * callers (webhook vs. client verify vs. wallet pay) race-safe: only one can
   * flip the row, the loser inserts nothing and returns false. Amounts are taken
   * from the row the flip returned, so the payment record always matches what
   * was actually booked.
   */
  async holdBookingFunds(
    bookingId: string,
    paystackRef: string,
    releaseDeadline: Date,
  ): Promise<boolean> {
    return db.transaction(async (tx) => {
      const [flipped] = await tx
        .update(bookings)
        .set({
          status: "HELD",
          escrowState: "HELD",
          releaseDeadline,
          updatedAt: new Date(),
        })
        .where(and(eq(bookings.id, bookingId), eq(bookings.status, "ACCEPTED")))
        .returning();
      if (!flipped) return false;

      await tx.insert(payments).values({
        id: crypto.randomUUID(),
        bookingId,
        amount: flipped.total,
        fee: flipped.fee,
        netAmount: flipped.total - flipped.fee,
        paystackRef,
        status: "HELD",
      });
      return true;
    });
  }

  /**
   * Start work on a paid booking (provider "Start Work" action). The flip is
   * conditional on `HELD` so a concurrent cron `setInProgress` / double click
   * collapses to one transition, and because no wallet or payment row is
   * touched here, a failure can never strand money — only the release deadline
   * governs settlement (unchanged).
   */
  async startBooking(bookingId: string): Promise<IBooking> {
    const booking = await new BookingService().getById(bookingId);
    if (!booking) throw new Error("Booking not found");
    // Shared state machine — HELD → IN_PROGRESS is the only legal path in.
    validateTransition(booking.status, BookingStatus.IN_PROGRESS);

    const [row] = await db
      .update(bookings)
      .set({
        status: "IN_PROGRESS",
        escrowState: "IN_PROGRESS",
        updatedAt: new Date(),
      })
      .where(and(eq(bookings.id, bookingId), eq(bookings.status, "HELD")))
      .returning();

    if (!row) {
      const current = await new BookingService().getById(bookingId);
      if (current?.status === "IN_PROGRESS") return current; // concurrent start won the race
      throw new Error("Booking is no longer awaiting work start");
    }
    return new BookingService().getById(bookingId) as Promise<IBooking>;
  }

  /**
   * Pay the provider out of held funds — exactly once. Ordering is
   * money-first so retries converge safely: the provider credit uses a
   * deterministic reference (`ESCROW-RELEASE-{bookingId}`, unique in
   * wallet_transactions), so a crash between credit and state flip re-runs as
   * a no-op credit + completed flip instead of double-paying, and concurrent
   * release paths (client confirm vs. cron auto-release) collapse to one credit.
   * A booking with no HELD payment row (milestone/unpaid/already settled)
   * is a clean no-op — this is the gate that prevents milestone double-pays.
   */
  async settleRelease(bookingId: string): Promise<void> {
    const held = await db
      .select()
      .from(payments)
      .where(and(eq(payments.bookingId, bookingId), eq(payments.status, "HELD")));
    if (held.length === 0) return;

    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);
    if (!booking) return; // caller surfaces not-found

    const walletService = new WalletService();
    for (const payment of held) {
      try {
        await walletService.creditFromEscrowRelease(
          booking.providerId,
          bookingId,
          payment.netAmount,
          payment.fee,
        );
      } catch (err) {
        if (!isUniqueViolation(err)) throw err;
        // Already credited — by a concurrent release or a previous attempt that
        // crashed before flipping. Fall through: the flip below is conditional
        // on HELD (idempotent), so running it here is what completes the retry
        // instead of leaving the payment stuck in HELD.
      }
      await db
        .update(payments)
        .set({ status: "RELEASED" })
        .where(and(eq(payments.id, payment.id), eq(payments.status, "HELD")));
    }
  }

  /**
   * Return held funds to the payer — exactly once, funding-aware:
   * - Wallet-funded (`WALLET-*` ref): credit the client's wallet back locally
   *   (deterministic `ESCROW-REFUND-{bookingId}` → idempotent) BEFORE the
   *   HELD→REFUNDED flip, so retries converge instead of double-crediting.
   * - Card-funded: flip HELD→REFUNDED FIRST so a retry can never double-refund,
   *   then request the Paystack refund; a failed refund request is logged loudly
   *   for a manual dashboard refund (the money stays in the platform balance —
   *   never lost, but never silently retried either).
   */
  async refundBookingFunds(bookingId: string): Promise<void> {
    const held = await db
      .select()
      .from(payments)
      .where(and(eq(payments.bookingId, bookingId), eq(payments.status, "HELD")));
    if (held.length === 0) return;

    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);
    if (!booking) return;

    const walletService = new WalletService();

    for (const payment of held) {
      const isWalletFunded = payment.paystackRef.startsWith("WALLET-");

      if (isWalletFunded) {
        try {
          await walletService.refundEscrowToClient(
            booking.clientId,
            bookingId,
            payment.amount,
            payment.netAmount,
          );
        } catch (err) {
          if (!isUniqueViolation(err)) throw err;
          // unique violation = a previous attempt already refunded — fall
          // through to the flip, which is conditional on HELD anyway.
        }
        await db
          .update(payments)
          .set({ status: "REFUNDED" })
          .where(and(eq(payments.id, payment.id), eq(payments.status, "HELD")));
        continue;
      }

      const [flipped] = await db
        .update(payments)
        .set({ status: "REFUNDED" })
        .where(and(eq(payments.id, payment.id), eq(payments.status, "HELD")))
        .returning({ id: payments.id });
      if (!flipped) continue;

      try {
        await refund(payment.paystackRef);
      } catch (err) {
        console.error(
          `[escrow] Paystack refund failed for ${payment.paystackRef} (booking ${bookingId}) — refund manually from the Paystack dashboard`,
          err,
        );
      }
    }
  }

  async setInProgress(): Promise<{ processed: number; errors: string[] }> {
    const platformConfig = await PlatformConfigService.get();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const toProgress = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.status, "HELD"),
          gte(bookings.serviceDate!, todayStart),
          lt(bookings.serviceDate!, new Date(todayEnd.getTime() + 1000)),
        ),
      );

    let processed = 0;
    const errors: string[] = [];

    for (const booking of toProgress) {
      try {
        await db
          .update(bookings)
          .set({
            status: "IN_PROGRESS",
            escrowState: "IN_PROGRESS",
            updatedAt: new Date(),
          })
          .where(eq(bookings.id, booking.id));
        processed++;
      } catch (err) {
        errors.push(
          `Booking ${booking.id}: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      }
    }

    return { processed, errors };
  }

  async clientConfirmRelease(
    bookingId: string,
    clientId: string,
  ): Promise<IBooking> {
    const booking = await new BookingService().getById(bookingId);
    if (!booking) throw new Error("Booking not found");
    if (booking.clientId !== clientId)
      throw new Error("Only the client can confirm release");
    if (booking.status === "RELEASED") return booking; // idempotent — double click / concurrent cron win
    if (booking.status !== "IN_PROGRESS")
      throw new Error("Booking must be IN_PROGRESS");

    // Money first (idempotent, see settleRelease), then the state flip — a
    // failure mid-way is retried as a no-op credit + completed flip.
    await this.settleRelease(bookingId);

    const [row] = await db
      .update(bookings)
      .set({
        status: "RELEASED",
        escrowState: "RELEASED",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(bookings.id, bookingId),
          eq(bookings.clientId, clientId),
          eq(bookings.status, "IN_PROGRESS"),
        ),
      )
      .returning({ id: bookings.id });

    if (!row) {
      const current = await new BookingService().getById(bookingId);
      if (current?.status === "RELEASED") return current; // concurrent release won the race
      throw new Error("Failed to confirm release");
    }
    return new BookingService().getById(bookingId) as Promise<IBooking>;
  }

  async autoRelease(): Promise<{ processed: number; errors: string[] }> {
    const now = new Date();
    const platformConfig = await PlatformConfigService.get();

    const pendingRelease = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.status, "IN_PROGRESS"),
          or(lt(bookings.releaseDeadline, now), isNull(bookings.releaseDeadline)),
        ),
      );

    let processed = 0;
    const errors: string[] = [];

    for (const booking of pendingRelease) {
      try {
        // Legacy/null deadline — backfill it (and wait) instead of releasing a
        // booking whose service date hasn't actually passed its window yet.
        if (!booking.releaseDeadline) {
          const computed = computeEscrowReleaseDeadline(
            booking.serviceDate,
            platformConfig.escrowReleaseDays,
          );
          if (computed.getTime() > now.getTime()) {
            await db
              .update(bookings)
              .set({ releaseDeadline: computed, updatedAt: new Date() })
              .where(eq(bookings.id, booking.id));
            continue;
          }
        }

        const openDispute = await db
          .select()
          .from(disputes)
          .where(
            and(
              eq(disputes.bookingId, booking.id),
              eq(disputes.outcome as any, null),
            ),
          );

        if (openDispute.length > 0) continue;

        // Money first (idempotent), then a conditional IN_PROGRESS→RELEASED flip
        // so a concurrent client confirm and this cron collapse to one release.
        await this.settleRelease(booking.id);
        const [flipped] = await db
          .update(bookings)
          .set({
            status: "RELEASED",
            escrowState: "RELEASED",
            updatedAt: new Date(),
          })
          .where(
            and(eq(bookings.id, booking.id), eq(bookings.status, "IN_PROGRESS")),
          )
          .returning({ id: bookings.id });
        if (flipped) processed++;
      } catch (err) {
        errors.push(
          `Booking ${booking.id}: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      }
    }

    return { processed, errors };
  }

  async raiseDispute(
    bookingId: string,
    clientId: string,
    reason: string,
  ): Promise<IDispute> {
    const booking = await new BookingService().getById(bookingId);
    if (!booking) throw new Error("Booking not found");
    if (booking.clientId !== clientId)
      throw new Error("Only the client can raise a dispute");
    if (booking.status !== "IN_PROGRESS")
      throw new Error("Booking must be IN_PROGRESS");

    // Effective deadline (backfilled value or the configured window computed on
    // the fly) — a missing stored deadline must not lock clients out of raising
    // a dispute, but a genuinely passed window still blocks.
    const deadline = booking.releaseDeadline
      ? new Date(booking.releaseDeadline)
      : computeEscrowReleaseDeadline(
          booking.serviceDate,
          (await PlatformConfigService.get()).escrowReleaseDays,
        );
    if (!Number.isNaN(deadline.getTime()) && new Date() >= deadline)
      throw new Error("Release deadline has passed");

    const [dispute] = await db.transaction(async (tx) => {
      await tx
        .update(bookings)
        .set({
          status: "DISPUTED",
          escrowState: "DISPUTED",
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, bookingId));

      return tx
        .insert(disputes)
        .values({
          id: crypto.randomUUID(),
          bookingId,
          raisedById: clientId,
          reason,
        })
        .returning();
    });

    return mapDispute(dispute);
  }

  async resolveDispute(
    disputeId: string,
    adminId: string,
    outcome: "RELEASED" | "REFUNDED",
    adminNotes?: string,
  ): Promise<IDispute> {
    const [dispute] = await db
      .select()
      .from(disputes)
      .where(eq(disputes.id, disputeId));

    if (!dispute) throw new Error("Dispute not found");

    const targetEscrowState: EscrowState =
      outcome === "RELEASED" ? EscrowState.RELEASED : EscrowState.REFUNDED;
    const targetBookingStatus: BookingStatus =
      outcome === "RELEASED" ? BookingStatus.RELEASED : BookingStatus.REFUNDED;

    const disputeOutcome = outcome === "RELEASED" ? "RESOLVED" : "REFUNDED";

    // Money first (both paths are exactly-once — see settleRelease /
    // refundBookingFunds). A throw here leaves the dispute unresolved, which is
    // the safe direction: the admin can retry and the conditional HELD flips
    // make the retry a no-op if a previous attempt already moved the funds.
    if (outcome === "RELEASED") {
      await this.settleRelease(dispute.bookingId);
    } else {
      await this.refundBookingFunds(dispute.bookingId);
    }

    const rows = await db.transaction(async (tx) => {
      await tx
        .update(disputes)
        .set({
          outcome: disputeOutcome,
          adminNotes: adminNotes ?? null,
          resolvedById: adminId,
          resolvedAt: new Date(),
        })
        .where(eq(disputes.id, disputeId));

      await tx
        .update(bookings)
        .set({
          status: targetBookingStatus,
          escrowState: targetEscrowState,
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, dispute.bookingId));

      return tx
        .select()
        .from(disputes)
        .where(eq(disputes.id, disputeId));
    });

    return mapDispute(rows[0]);
  }
}
