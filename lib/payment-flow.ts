/**
 * Pure payment/booking money-path helpers — no DB, no network, fully unit
 * testable. These encode the attribution + classification rules that decide
 * whether a Paystack charge can be held in escrow, whether the webhook should
 * tell Paystack "processed" (200) or "retry" (5xx), and what the client-facing
 * verify endpoint is allowed to claim.
 *
 * Why this exists (2026-10-19): `holdBookingFunds` is the only writer of the
 * HELD state, and every refusal used to collapse into a `console.error` while
 * both `/pay/verify` (verified:true regardless) and the webhook (de-dupe row
 * written regardless) reported success — leaving bookings stuck at
 * `ACCEPTED` + `escrowState PENDING` with money charged and no retry path.
 */

/** Booking payment references are `CRELLAB-{bookingId}-{unixMillis}`. */
export const BOOKING_REF_PREFIX = "CRELLAB-";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TRAILING_MS_PATTERN = /^\d{10,}$/;

/**
 * Recover the booking id embedded in a generated reference.
 *
 * References are regenerated on every checkout initiation (Paystack refs must
 * be unique per transaction), so `bookings.paystackRef` only remembers the
 * LATEST one — a charge made under an earlier ref would otherwise be
 * unattributable. Parsing makes every previously issued ref resolvable again
 * without a schema change.
 */
export function parseBookingIdFromRef(
  reference: string | null | undefined,
): string | null {
  if (!reference || !reference.startsWith(BOOKING_REF_PREFIX)) return null;
  const rest = reference.slice(BOOKING_REF_PREFIX.length);
  const separator = rest.lastIndexOf("-");
  if (separator <= 0) return null;
  const candidate = rest.slice(0, separator);
  const tail = rest.slice(separator + 1);
  if (!TRAILING_MS_PATTERN.test(tail)) return null;
  return UUID_PATTERN.test(candidate) ? candidate.toLowerCase() : null;
}

/** Why a hold attempt did not (or did not need to) move money into escrow. */
export type HoldReason =
  | "already_held"
  | "not_payable"
  | "duplicate_charge"
  | "no_booking"
  | "hold_lost_race"
  | null;

export interface HoldResult {
  /** This call created the ACCEPTED → HELD transition + payment row. */
  held: boolean;
  /** The money is in escrow (possibly via an earlier/concurrent call). */
  alreadyHeld: boolean;
  bookingId: string | null;
  /** Booking status observed at classification time. */
  bookingStatus: string | null;
  reason: HoldReason;
  /**
   * Transient — callers must NOT mark the event processed: the webhook should
   * answer non-2xx so Paystack retries, and `/pay/verify` should keep polling.
   */
  retryable: boolean;
  /**
   * A second charge landed for a booking that was already held (earlier ref or
   * concurrent checkout). Money sits in the platform balance with no payment
   * row — flagged for refund review, never silently swallowed.
   */
  duplicateCharge: boolean;
}

export interface HoldClassificationInput {
  /** A booking row was found for the reference (exact, hinted or parsed). */
  bookingFound: boolean;
  /** A payments row already carries this exact reference. */
  referenceAlreadyHeld: boolean;
  /** Booking status read before the hold attempt (null when not found). */
  statusBefore: string | null;
  /** Whether the conditional ACCEPTED → HELD update matched. */
  flipped: boolean;
  /** Status re-read after a failed flip (drives retryable vs. permanent). */
  statusAfter?: string | null;
}

/**
 * Turn the observable facts of a hold attempt into the single decision object
 * every caller (webhook, verify, reconcile) branches on. Kept pure so the
 * state-machine edge cases are testable without a database.
 */
export function classifyHoldOutcome(input: HoldClassificationInput): HoldResult {
  const base = {
    bookingId: null as string | null,
    bookingStatus: input.statusAfter ?? input.statusBefore,
  };

  if (!input.bookingFound) {
    return {
      ...base,
      held: false,
      alreadyHeld: false,
      reason: "no_booking",
      // Retrying cannot conjure the booking that was never found — permanent,
      // but audited so a charged-but-unattributable payment is reviewable.
      retryable: false,
      duplicateCharge: false,
    };
  }

  if (input.referenceAlreadyHeld) {
    return {
      ...base,
      held: false,
      alreadyHeld: true,
      reason: "already_held",
      retryable: false,
      duplicateCharge: false,
    };
  }

  if (input.flipped) {
    return {
      ...base,
      bookingStatus: "HELD",
      held: true,
      alreadyHeld: false,
      reason: null,
      retryable: false,
      duplicateCharge: false,
    };
  }

  const statusBefore = input.statusBefore;
  const statusAfter = input.statusAfter ?? input.statusBefore;

  // Booking already in escrow under a different reference: this charge is a
  // duplicate — never treat it as success, never drop it either.
  if (statusBefore === "HELD") {
    return {
      ...base,
      held: false,
      alreadyHeld: false,
      reason: "duplicate_charge",
      retryable: false,
      duplicateCharge: true,
    };
  }

  if (statusBefore === "ACCEPTED") {
    if (statusAfter === "HELD") {
      // A concurrent caller (webhook vs verify vs wallet) won the flip.
      return {
        ...base,
        bookingStatus: "HELD",
        held: false,
        alreadyHeld: true,
        reason: "already_held",
        retryable: false,
        duplicateCharge: false,
      };
    }
    if (statusAfter === "ACCEPTED") {
      // Flip matched nothing while the row still looks payable — transient
      // (mid-flight writer / replica lag): worth one more attempt.
      return {
        ...base,
        held: false,
        alreadyHeld: false,
        reason: "hold_lost_race",
        retryable: true,
        duplicateCharge: false,
      };
    }
  }

  // Cancelled / declined / requested out from under the charge: permanent.
  return {
    ...base,
    bookingStatus: statusAfter,
    held: false,
    alreadyHeld: false,
    reason: "not_payable",
    retryable: false,
    duplicateCharge: false,
  };
}

/**
 * Webhook decision: record the de-dupe row (→ answer 200) only when the
 * outcome is terminal. `retryable` outcomes answer 5xx WITHOUT recording so
 * Paystack's own retry can finish the hold instead of the event being marked
 * processed while no money was held.
 */
export function shouldRecordChargeEvent(result: HoldResult): boolean {
  return !result.retryable;
}

/** Human-facing verify reason → the message the client hook should surface. */
export function holdFailureMessage(result: HoldResult): string | null {
  switch (result.reason) {
    case "not_payable":
      return "Your payment was received, but this booking is no longer payable — our team has been notified to review it for a refund.";
    case "duplicate_charge":
      return "Your payment was received, but this booking is already funded in escrow — our team has been notified to review the extra charge.";
    case "no_booking":
      return "Your payment was received but could not be matched to this booking — our team has been notified.";
    case "hold_lost_race":
      return "Your payment was received — securing it in escrow is still completing. This page will update shortly.";
    default:
      return null;
  }
}

/** True when the charge is real but escrow has not caught up yet (keep trying). */
export function isHoldPending(result: HoldResult): boolean {
  return result.retryable;
}
