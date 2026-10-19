import { db } from "@/lib/db";
import { bookings, payments, disputes } from "@/drizzle/schema";
import { eq, and, lt, gte, isNull, or, isNotNull, ne, asc } from "drizzle-orm";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { WalletService } from "@/services/WalletService";
import { AuditService } from "@/services/AuditService";
import { initTransaction, refund, verifyTransaction } from "@/lib/paystack";
import {
  classifyHoldOutcome,
  parseBookingIdFromRef,
  type HoldResult,
} from "@/lib/payment-flow";
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
import { JobQueueService } from "@/services/JobQueueService";
import {
  notifyBookingStarted,
  notifyDisputeOpened,
  notifyDisputeResolved,
  notifyFundsHeld,
  notifyFundsRefunded,
  notifyFundsReleased,
} from "@/lib/lifecycle-emails";

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

/**
 * Result of checking one booking's charge against the processor and (when the
 * charge is real) re-attempting the escrow hold. Every stuck-charge surface —
 * the pre-flight in `/pay`, the booking-detail self-heal, the cron sweep and
 * the admin "Reconcile escrow" action — speaks this vocabulary so one word
 * means one thing everywhere.
 */
export type ReconcileOutcome =
  /** Funds are in escrow already (nothing to do). */
  | "already_held"
  /** This call created the hold from a verified charge. */
  | "held"
  /** Processor says the charge never succeeded (safe to start a new checkout). */
  | "not_charged"
  /** Processor says the charge is still processing (do NOT start another one). */
  | "charge_pending"
  /** Charged amount ≠ booked amount — never settle silently, refund review. */
  | "amount_mismatch"
  /** The reference belongs to a different payment/booking — refund review. */
  | "attribution_mismatch"
  /** Charged, but the booking left the payable state — refund review. */
  | "not_payable"
  /** A second charge for a booking that is already funded — refund review. */
  | "duplicate_charge"
  /** No stored reference — nothing has been charged under our records. */
  | "no_reference"
  /** Processor unreachable / hold still converging — try again shortly. */
  | "unverifiable";

export interface ReconcileOptions {
  /** Ask Paystack for the authoritative charge status (default true). */
  verifyWithProcessor?: boolean;
  /** Write `escrow.reconcile` audit rows for material outcomes (default true). */
  audit?: boolean;
  /** Who triggered it — null/omitted = system (cron). */
  actorId?: string | null;
}

export interface ReconcileResult {
  outcome: ReconcileOutcome;
  bookingId: string;
  bookingStatus: string;
  reference: string | null;
  held: boolean;
  alreadyHeld: boolean;
  detail?: string;
}

export interface ReconcileSweepResult {
  scanned: number;
  held: number;
  alreadyHeld: number;
  /** Charged-but-unsettled anomalies an admin should look at. */
  needsReview: number;
  skipped: number;
  errors: string[];
}

/** Outcomes that mean a human should review the money. */
export const RECONCILE_REVIEW_OUTCOMES: ReconcileOutcome[] = [
  "amount_mismatch",
  "attribution_mismatch",
  "not_payable",
  "duplicate_charge",
];

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
  /** Finalize a verified Paystack charge into escrow HELD. Idempotent; returns the full hold outcome. */
  onPaystackSuccess(
    reference: string,
    options?: { bookingId?: string | null },
  ): Promise<HoldResult>;
  /** Exactly-once ACCEPTED→HELD transition + payment-row creation. Returns true when this call held the funds. */
  holdBookingFunds(bookingId: string, paystackRef: string, releaseDeadline: Date): Promise<boolean>;
  /** Resolve a charge reference back to its booking (exact ref → hint → parsed id). */
  resolveBookingForRef(
    reference: string,
    hintBookingId?: string | null,
  ): Promise<typeof bookings.$inferSelect | null>;
  /** Processor-verify one booking's stored charge and hold it when real. */
  reconcileBooking(bookingId: string, options?: ReconcileOptions): Promise<ReconcileResult>;
  /** Sweep charged-but-unheld bookings (cron safety net). */
  reconcileStuckHolds(options?: { limit?: number; graceMs?: number }): Promise<ReconcileSweepResult>;
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
  /** Full idempotent safety sweep (reconcile stuck holds → in-progress → auto-release). */
  runFullSweep(): Promise<{
    results: Record<string, unknown>;
    totalProcessed: number;
    totalErrors: string[];
  }>;
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
   * Resolve a charge reference back to the booking it belongs to.
   *
   * Lookup order matters: `initiate()` issues a NEW reference on every checkout
   * attempt and overwrites `bookings.paystackRef`, so a charge made under an
   * earlier reference no longer matches the stored column. The hinted id (the
   * webhook/verify metadata we already trust) and the id embedded in the
   * reference itself both recover attribution without a schema change.
   */
  async resolveBookingForRef(
    reference: string,
    hintBookingId: string | null = null,
  ): Promise<typeof bookings.$inferSelect | null> {
    if (!reference) return null;

    const [byRef] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.paystackRef, reference))
      .limit(1);
    if (byRef) return byRef;

    const parsedId = parseBookingIdFromRef(reference);
    const candidateIds = [hintBookingId, parsedId].filter(
      (id): id is string => typeof id === "string" && id.length > 0,
    );
    for (const candidateId of candidateIds) {
      const [row] = await db
        .select()
        .from(bookings)
        .where(eq(bookings.id, candidateId))
        .limit(1);
      if (row) return row;
    }
    return null;
  }

  /** Loud, structured trace for a hold that did NOT move money (audit + log). */
  private async logHoldFailure(
    reference: string,
    result: HoldResult,
    bookingId: string | null,
    actorId: string | null = null,
  ): Promise<void> {
    const action = result.duplicateCharge
      ? "escrow.hold.duplicate"
      : "escrow.hold.failed";
    const detail = `ref=${reference} booking=${bookingId ?? "?"} reason=${result.reason ?? "unknown"} status=${result.bookingStatus ?? "?"}`;
    if (result.retryable) {
      console.warn(`[escrow] hold not finalized yet (${detail}) — caller will retry`);
      return; // transient — a webhook retry (or verify poll) is already the retry path
    }
    console.error(`[escrow] ${action} ${detail} — manual review required`);
    await AuditService.log({
      userId: actorId,
      action,
      entity: "bookings",
      entityId: bookingId,
      oldValue: { reference, status: result.bookingStatus },
      newValue: { reason: result.reason, reference, retryable: result.retryable },
    }).catch((err) => {
      console.error("[escrow] hold-failure audit log failed", err);
    });
  }

  /**
   * Finalize a successful Paystack charge into escrow HELD. Idempotent on
   * purpose — the webhook AND the client-side verify endpoint may both run it:
   * a payment row already carrying this reference means the money is already
   * held (skip), and a booking that left the payable state needs a manual
   * refund instead of silently being resurrected.
   *
   * Returns the full `HoldResult` so callers can distinguish "held",
   * "already held" (safe to report success), "permanent failure" (record it,
   * audit it, tell the truth) and "retryable" (never record — let Paystack's
   * retry or the verify poll finish the job).
   */
  async onPaystackSuccess(
    reference: string,
    options: { bookingId?: string | null } = {},
  ): Promise<HoldResult> {
    const hintBookingId = options.bookingId ?? null;
    const booking = await this.resolveBookingForRef(reference, hintBookingId);

    if (!booking) {
      const classified = classifyHoldOutcome({
        bookingFound: false,
        referenceAlreadyHeld: false,
        statusBefore: null,
        flipped: false,
      });
      const result: HoldResult = { ...classified, bookingId: hintBookingId };
      await this.logHoldFailure(reference, result, hintBookingId);
      return result;
    }

    const [existingPayment] = await db
      .select({ id: payments.id })
      .from(payments)
      .where(eq(payments.paystackRef, reference))
      .limit(1);

    let flipped = false;
    if (booking.status === "ACCEPTED") {
      const platformConfig = await PlatformConfigService.get();
      const releaseDeadline = computeEscrowReleaseDeadline(
        booking.serviceDate,
        platformConfig.escrowReleaseDays,
      );
      flipped = await this.holdBookingFunds(booking.id, reference, releaseDeadline);
    }

    const statusAfter = flipped
      ? "HELD"
      : ((await new BookingService().getById(booking.id))?.status ?? booking.status);

    const classified = classifyHoldOutcome({
      bookingFound: true,
      referenceAlreadyHeld: Boolean(existingPayment),
      statusBefore: booking.status,
      flipped,
      statusAfter,
    });
    const result: HoldResult = {
      ...classified,
      bookingId: booking.id,
      bookingStatus: statusAfter,
    };

    if (!result.held && !result.alreadyHeld) {
      await this.logHoldFailure(reference, result, booking.id, booking.clientId);
    }
    return result;
  }

  /**
   * Check ONE booking's stored charge against Paystack and hold it when the
   * charge is real. Used by every self-heal surface:
   *  - `/pay` pre-flight   → returns success immediately when an earlier
   *    attempt actually went through, and blocks a second charge while one is
   *    still processing;
   *  - booking-detail page → a stuck booking heals itself on view;
   *  - cron sweep          → background safety net;
   *  - admin reconcile     → explicit, audited repair action.
   * Never invents money: without the processor saying "success" (or a stored
   * reference), no hold is attempted.
   */
  async reconcileBooking(
    bookingId: string,
    options: ReconcileOptions = {},
  ): Promise<ReconcileResult> {
    const { verifyWithProcessor = true, audit = true, actorId = null } = options;
    const booking = await new BookingService().getById(bookingId);
    if (!booking) throw new Error("Booking not found");

    const base = {
      bookingId,
      bookingStatus: booking.status,
      reference: booking.paystackRef,
    };

    const logReconcile = async (
      outcome: ReconcileOutcome,
      extra: Record<string, unknown>,
    ) => {
      if (!audit) return;
      await AuditService.log({
        userId: actorId,
        action: "escrow.reconcile",
        entity: "bookings",
        entityId: bookingId,
        newValue: { outcome, reference: booking.paystackRef, ...extra },
      }).catch((err) => {
        console.error(`[escrow] reconcile audit failed for booking ${bookingId}`, err);
      });
    };

    // Already in escrow — including the held-but-no-payment-row anomaly, which
    // must be visible (nothing would ever release it) rather than "fixed" by
    // inventing a payment record for money we can't prove was charged.
    if (booking.status === "HELD" || booking.escrowState === "HELD") {
      const [pay] = await db
        .select({ id: payments.id })
        .from(payments)
        .where(eq(payments.bookingId, bookingId))
        .limit(1);
      if (!pay) {
        await AuditService.log({
          userId: actorId,
          action: "escrow.payment_row_missing",
          entity: "bookings",
          entityId: bookingId,
          newValue: { reference: booking.paystackRef, status: booking.status },
        }).catch((err) => {
          console.error("[escrow] payment-row anomaly audit failed", err);
        });
      }
      return {
        ...base,
        bookingStatus: "HELD",
        outcome: "already_held",
        held: false,
        alreadyHeld: true,
        detail: pay ? undefined : "Booking is held but has no payment row — review",
      };
    }

    const reference = booking.paystackRef;
    // Wallet-funded holds never store a Paystack reference (they settle
    // synchronously), so there is nothing to verify — nothing charged here.
    if (!reference || reference.startsWith("WALLET-")) {
      return {
        ...base,
        outcome: "no_reference",
        held: false,
        alreadyHeld: false,
        detail: "No stored charge reference for this booking",
      };
    }

    if (verifyWithProcessor) {
      let verified;
      try {
        verified = await verifyTransaction(reference);
      } catch (err) {
        const detail = err instanceof Error ? err.message : "Processor unreachable";
        return {
          ...base,
          outcome: "unverifiable",
          held: false,
          alreadyHeld: false,
          detail,
        };
      }

      if (verified.status !== "success") {
        return {
          ...base,
          outcome: verified.status === "pending" ? "charge_pending" : "not_charged",
          held: false,
          alreadyHeld: false,
          detail: `Processor status: ${verified.status}`,
        };
      }

      if (verified.amountKobo !== booking.total) {
        const detail = `Paid ${verified.amountKobo} kobo, booking expects ${booking.total} kobo`;
        if (audit) {
          console.error(`[escrow] reconcile amount mismatch for booking ${bookingId}: ${detail}`);
        }
        await logReconcile("amount_mismatch", { detail });
        return {
          ...base,
          outcome: "amount_mismatch",
          held: false,
          alreadyHeld: false,
          detail,
        };
      }

      // Trust echoed metadata when present — a reference string alone must
      // never move a booking into escrow (legacy charges without metadata pass).
      const metaPurpose = verified.metadata?.purpose as string | undefined;
      const metaBookingId = verified.metadata?.bookingId as string | undefined;
      if ((metaPurpose && metaPurpose !== "BOOKING_PAYMENT") || (metaBookingId && metaBookingId !== bookingId)) {
        const detail = "Charge metadata does not belong to this booking";
        await logReconcile("attribution_mismatch", { detail, metaPurpose, metaBookingId });
        return {
          ...base,
          outcome: "attribution_mismatch",
          held: false,
          alreadyHeld: false,
          detail,
        };
      }
    }

    const hold = await this.onPaystackSuccess(reference, { bookingId });
    if (hold.held) {
      await logReconcile("held", {});
      return {
        ...base,
        bookingStatus: "HELD",
        outcome: "held",
        held: true,
        alreadyHeld: false,
      };
    }
    if (hold.alreadyHeld) {
      return {
        ...base,
        bookingStatus: "HELD",
        outcome: "already_held",
        held: false,
        alreadyHeld: true,
      };
    }
    if (hold.retryable) {
      return {
        ...base,
        outcome: "unverifiable",
        held: false,
        alreadyHeld: false,
        detail: "Hold is still converging — check again shortly",
      };
    }

    const outcome: ReconcileOutcome =
      hold.reason === "duplicate_charge"
        ? "duplicate_charge"
        : hold.reason === "not_payable"
          ? "not_payable"
          : "unverifiable";
    if (RECONCILE_REVIEW_OUTCOMES.includes(outcome)) {
      await logReconcile(outcome, { holdReason: hold.reason });
    }
    return {
      ...base,
      bookingStatus: hold.bookingStatus ?? booking.status,
      outcome,
      held: false,
      alreadyHeld: false,
      detail: hold.reason ?? undefined,
    };
  }

  /**
   * Background safety net: re-check bookings that are still `ACCEPTED` +
   * `PENDING` with a stored reference after the grace period — exactly the
   * "charged but never held" state the webhook/verify failures used to leave
   * behind — and hold them when Paystack confirms the charge succeeded.
   * Bounded (default 25) and processor-verified, so it can never hold funds
   * for a checkout that was never paid.
   */
  async reconcileStuckHolds(
    options: { limit?: number; graceMs?: number } = {},
  ): Promise<ReconcileSweepResult> {
    const limit = Math.max(1, Math.min(options.limit ?? 25, 100));
    const graceMs = options.graceMs ?? 2 * 60 * 1000;
    const cutoff = new Date(Date.now() - graceMs);

    const candidates = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(
        and(
          eq(bookings.status, "ACCEPTED"),
          eq(bookings.escrowState, "PENDING"),
          isNotNull(bookings.paystackRef),
          ne(bookings.paymentMode, "MILESTONE"),
          lt(bookings.updatedAt, cutoff),
        ),
      )
      .orderBy(asc(bookings.updatedAt))
      .limit(limit);

    const result: ReconcileSweepResult = {
      scanned: candidates.length,
      held: 0,
      alreadyHeld: 0,
      needsReview: 0,
      skipped: 0,
      errors: [],
    };

    for (const candidate of candidates) {
      try {
        const reconciled = await this.reconcileBooking(candidate.id, {
          actorId: null,
          audit: true,
        });
        if (reconciled.outcome === "held") result.held++;
        else if (reconciled.outcome === "already_held") result.alreadyHeld++;
        else if (RECONCILE_REVIEW_OUTCOMES.includes(reconciled.outcome)) result.needsReview++;
        else result.skipped++;
      } catch (err) {
        result.errors.push(
          `Booking ${candidate.id}: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      }
    }

    return result;
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
    const held = await db.transaction(async (tx) => {
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

    if (held) {
      // Post-commit side effects (never inside the money transaction):
      // audit trail, client "funds in escrow" email, and queued follow-up
      // escrow sweeps (+6h/+12h/+24h) so the Hobby daily-cron limit never
      // delays stuck-hold repair.
      void AuditService.log({
        userId: null,
        action: "escrow.held",
        entity: "bookings",
        entityId: bookingId,
        newValue: { paystackRef, releaseDeadline: releaseDeadline.toISOString() },
      }).catch(() => {});
      void notifyFundsHeld(bookingId);
      void new JobQueueService().enqueueEscrowFollowUps(bookingId);
    }

    return held;
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
    void notifyBookingStarted(bookingId);
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
      let newlyReleased = false;
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
      const [flipped] = await db
        .update(payments)
        .set({ status: "RELEASED" })
        .where(and(eq(payments.id, payment.id), eq(payments.status, "HELD")))
        .returning({ id: payments.id });
      if (flipped) newlyReleased = true;

      if (newlyReleased) {
        void AuditService.log({
          userId: null,
          action: "escrow.released",
          entity: "bookings",
          entityId: bookingId,
          newValue: { paymentId: payment.id, netKobo: payment.netAmount, feeKobo: payment.fee },
        }).catch(() => {});
        void notifyFundsReleased(bookingId, payment.netAmount);
      }
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
        const [flippedWallet] = await db
          .update(payments)
          .set({ status: "REFUNDED" })
          .where(and(eq(payments.id, payment.id), eq(payments.status, "HELD")))
          .returning({ id: payments.id });
        if (flippedWallet) {
          void AuditService.log({
            userId: null,
            action: "escrow.refunded",
            entity: "bookings",
            entityId: bookingId,
            newValue: { paymentId: payment.id, amountKobo: payment.amount, funding: "WALLET" },
          }).catch(() => {});
          void notifyFundsRefunded(bookingId);
        }
        continue;
      }

      const [flipped] = await db
        .update(payments)
        .set({ status: "REFUNDED" })
        .where(and(eq(payments.id, payment.id), eq(payments.status, "HELD")))
        .returning({ id: payments.id });
      if (!flipped) continue;

      void AuditService.log({
        userId: null,
        action: "escrow.refunded",
        entity: "bookings",
        entityId: bookingId,
        newValue: { paymentId: payment.id, amountKobo: payment.amount, funding: "CARD" },
      }).catch(() => {});
      void notifyFundsRefunded(bookingId);

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

  /**
   * The complete escrow safety sweep, shared by the daily Vercel cron
   * (`/api/cron/escrow`) and the DB-backed `escrow_sweep` job handler. Every
   * step is idempotent and individually error-isolated so one failing stage
   * never skips the rest.
   */
  async runFullSweep(): Promise<{
    results: Record<string, unknown>;
    totalProcessed: number;
    totalErrors: string[];
  }> {
    const results: Record<string, unknown> = {};

    try {
      results.reconcileStuckHolds = await this.reconcileStuckHolds();
    } catch (err) {
      results.reconcileStuckHolds = {
        scanned: 0,
        held: 0,
        alreadyHeld: 0,
        needsReview: 0,
        skipped: 0,
        errors: [err instanceof Error ? err.message : "Unknown error in reconcileStuckHolds"],
      };
    }

    try {
      results.setProgress = await this.setInProgress();
    } catch (err) {
      results.setProgress = {
        processed: 0,
        errors: [err instanceof Error ? err.message : "Unknown error in setInProgress"],
      };
    }

    try {
      results.autoRelease = await this.autoRelease();
    } catch (err) {
      results.autoRelease = {
        processed: 0,
        errors: [err instanceof Error ? err.message : "Unknown error in autoRelease"],
      };
    }

    const reconcileResult = results.reconcileStuckHolds as { held: number; errors: string[] } | undefined;
    const inProgressResult = results.setProgress as { processed: number; errors: string[] } | undefined;
    const autoReleaseResult = results.autoRelease as { processed: number; errors: string[] } | undefined;

    const totalProcessed =
      (reconcileResult?.held ?? 0) +
      (inProgressResult?.processed ?? 0) +
      (autoReleaseResult?.processed ?? 0);

    const totalErrors = [
      ...(reconcileResult?.errors ?? []),
      ...(inProgressResult?.errors ?? []),
      ...(autoReleaseResult?.errors ?? []),
    ];

    return { results, totalProcessed, totalErrors };
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

    void AuditService.log({
      userId: clientId,
      action: "escrow.dispute.opened",
      entity: "bookings",
      entityId: bookingId,
      newValue: { disputeId: dispute.id, reason },
    }).catch(() => {});
    void notifyDisputeOpened(bookingId);

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

    void AuditService.log({
      userId: adminId,
      action: "escrow.dispute.resolved",
      entity: "bookings",
      entityId: dispute.bookingId,
      oldValue: { disputeOutcome: dispute.outcome },
      newValue: { disputeId, outcome, adminNotes: adminNotes ?? null },
    }).catch(() => {});
    void notifyDisputeResolved(dispute.bookingId, outcome);

    return mapDispute(rows[0]);
  }
}
