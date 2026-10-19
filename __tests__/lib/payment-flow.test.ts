import { describe, it, expect } from "vitest";
import {
  parseBookingIdFromRef,
  classifyHoldOutcome,
  shouldRecordChargeEvent,
  holdFailureMessage,
  isHoldPending,
} from "@/lib/payment-flow";

const BOOKING_ID = "3f6d0f9a-1c2b-4d5e-8f90-abcdefabcdef";

describe("lib/payment-flow — parseBookingIdFromRef", () => {
  it("parses a well-formed generated reference", () => {
    const ref = `CRELLAB-${BOOKING_ID}-1730000000000`;
    expect(parseBookingIdFromRef(ref)).toBe(BOOKING_ID);
  });

  it("returns null for a wallet reference (never parseable as a booking id)", () => {
    expect(parseBookingIdFromRef(`WALLET-${BOOKING_ID}-1730000000000`)).toBeNull();
  });

  it("returns null for null/undefined/empty", () => {
    expect(parseBookingIdFromRef(null)).toBeNull();
    expect(parseBookingIdFromRef(undefined)).toBeNull();
    expect(parseBookingIdFromRef("")).toBeNull();
  });

  it("returns null when the candidate id is not a UUID", () => {
    expect(parseBookingIdFromRef("CRELLAB-not-a-uuid-1730000000000")).toBeNull();
  });

  it("returns null when the trailing millis segment is missing or malformed", () => {
    expect(parseBookingIdFromRef(`CRELLAB-${BOOKING_ID}`)).toBeNull();
    expect(parseBookingIdFromRef(`CRELLAB-${BOOKING_ID}-soon`)).toBeNull();
    expect(parseBookingIdFromRef(`CRELLAB-${BOOKING_ID}-123`)).toBeNull(); // too short
  });

  it("accepts uppercase UUIDs and lowercases them", () => {
    const upper = BOOKING_ID.toUpperCase();
    expect(parseBookingIdFromRef(`CRELLAB-${upper}-1730000000000`)).toBe(BOOKING_ID);
  });

  it("still parses references generated under an EARLIER checkout attempt", () => {
    // The core fix: initiate() regenerates the ref on every attempt — an older
    // ref must remain attributable via its embedded id.
    const earlier = `CRELLAB-${BOOKING_ID}-1729000000000`;
    expect(parseBookingIdFromRef(earlier)).toBe(BOOKING_ID);
  });
});

describe("lib/payment-flow — classifyHoldOutcome", () => {
  const base = {
    bookingFound: true,
    referenceAlreadyHeld: false,
    statusBefore: "ACCEPTED",
    flipped: true,
  };

  it("held: flipped ACCEPTED → HELD is a success, not retryable", () => {
    const r = classifyHoldOutcome(base);
    expect(r.held).toBe(true);
    expect(r.alreadyHeld).toBe(false);
    expect(r.retryable).toBe(false);
    expect(r.duplicateCharge).toBe(false);
    expect(r.reason).toBeNull();
  });

  it("already_held: a payments row already carries this reference", () => {
    const r = classifyHoldOutcome({ ...base, flipped: false, referenceAlreadyHeld: true });
    expect(r.held).toBe(false);
    expect(r.alreadyHeld).toBe(true);
    expect(r.retryable).toBe(false);
    expect(r.reason).toBe("already_held");
  });

  it("already_held: a concurrent caller won the flip (status now HELD)", () => {
    const r = classifyHoldOutcome({ ...base, flipped: false, statusAfter: "HELD" });
    expect(r.alreadyHeld).toBe(true);
    expect(r.held).toBe(false);
    expect(r.retryable).toBe(false);
  });

  it("hold_lost_race: still ACCEPTED after a failed flip — RETRYABLE", () => {
    const r = classifyHoldOutcome({ ...base, flipped: false, statusAfter: "ACCEPTED" });
    expect(r.held).toBe(false);
    expect(r.alreadyHeld).toBe(false);
    expect(r.retryable).toBe(true);
    expect(r.reason).toBe("hold_lost_race");
  });

  it("duplicate_charge: booking was already HELD before this charge", () => {
    const r = classifyHoldOutcome({ ...base, statusBefore: "HELD", flipped: false, statusAfter: "HELD" });
    expect(r.duplicateCharge).toBe(true);
    expect(r.alreadyHeld).toBe(false);
    expect(r.retryable).toBe(false);
    expect(r.reason).toBe("duplicate_charge");
  });

  it("not_payable: booking left the payable state (cancelled) — permanent", () => {
    const r = classifyHoldOutcome({ ...base, flipped: false, statusAfter: "CANCELLED" });
    expect(r.held).toBe(false);
    expect(r.retryable).toBe(false);
    expect(r.reason).toBe("not_payable");
    expect(r.bookingStatus).toBe("CANCELLED");
  });

  it("no_booking: no booking resolved for the reference — permanent", () => {
    const r = classifyHoldOutcome({
      bookingFound: false,
      referenceAlreadyHeld: false,
      statusBefore: null,
      flipped: false,
    });
    expect(r.reason).toBe("no_booking");
    expect(r.retryable).toBe(false);
    expect(r.bookingId).toBeNull();
  });
});

describe("lib/payment-flow — shouldRecordChargeEvent (webhook de-dupe gate)", () => {
  it("records terminal outcomes (held / already_held / permanent failures)", () => {
    expect(shouldRecordChargeEvent({ retryable: false } as never)).toBe(true);
  });

  it("does NOT record retryable outcomes — lets Paystack's retry finish the hold", () => {
    expect(shouldRecordChargeEvent({ retryable: true } as never)).toBe(false);
  });
});

describe("lib/payment-flow — holdFailureMessage / isHoldPending", () => {
  it("returns a human message for each permanent failure reason", () => {
    for (const reason of ["not_payable", "duplicate_charge", "no_booking"] as const) {
      const msg = holdFailureMessage({ reason } as never);
      expect(msg).toBeTruthy();
      expect(msg!.length).toBeGreaterThan(20);
    }
  });

  it("returns null when held (nothing to tell the user)", () => {
    expect(holdFailureMessage({ reason: null, held: true } as never)).toBeNull();
  });

  it("isHoldPending mirrors retryable (money real, escrow converging)", () => {
    expect(isHoldPending({ retryable: true } as never)).toBe(true);
    expect(isHoldPending({ retryable: false } as never)).toBe(false);
  });
});
