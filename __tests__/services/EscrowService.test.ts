import { describe, it, expect } from "vitest";
import { EscrowState } from "@/types";
import {
  LEGAL_ESCROW_TRANSITIONS,
  computeEscrowReleaseDeadline,
  isUniqueViolation,
} from "@/services/EscrowService";

describe("EscrowService — State Machine (LEGAL_ESCROW_TRANSITIONS)", () => {
  it("defines legal transitions for all EscrowState values", () => {
    const allStates = Object.values(EscrowState);
    for (const state of allStates) {
      expect(LEGAL_ESCROW_TRANSITIONS).toHaveProperty(state);
    }
  });

  it("PENDING can transition to HELD", () => {
    expect(LEGAL_ESCROW_TRANSITIONS[EscrowState.PENDING]).toContain(EscrowState.HELD);
  });

  it("HELD can transition to IN_PROGRESS or REFUNDED", () => {
    expect(LEGAL_ESCROW_TRANSITIONS[EscrowState.HELD]).toContain(EscrowState.IN_PROGRESS);
    expect(LEGAL_ESCROW_TRANSITIONS[EscrowState.HELD]).toContain(EscrowState.REFUNDED);
  });

  it("IN_PROGRESS can transition to RELEASED or DISPUTED", () => {
    expect(LEGAL_ESCROW_TRANSITIONS[EscrowState.IN_PROGRESS]).toContain(EscrowState.RELEASED);
    expect(LEGAL_ESCROW_TRANSITIONS[EscrowState.IN_PROGRESS]).toContain(EscrowState.DISPUTED);
  });

  it("RELEASED and REFUNDED are terminal states", () => {
    expect(LEGAL_ESCROW_TRANSITIONS[EscrowState.RELEASED]).toEqual([]);
    expect(LEGAL_ESCROW_TRANSITIONS[EscrowState.REFUNDED]).toEqual([]);
  });

  it("DISPUTED can transition to REFUNDED or RELEASED (resolution)", () => {
    expect(LEGAL_ESCROW_TRANSITIONS[EscrowState.DISPUTED]).toContain(EscrowState.REFUNDED);
    expect(LEGAL_ESCROW_TRANSITIONS[EscrowState.DISPUTED]).toContain(EscrowState.RELEASED);
  });

  it("no state can transition to PENDING (no cycles back to start)", () => {
    for (const toStates of Object.values(LEGAL_ESCROW_TRANSITIONS)) {
      expect(toStates).not.toContain(EscrowState.PENDING);
    }
  });

  it("every transition is a valid EscrowState", () => {
    const allStates = new Set(Object.values(EscrowState));
    for (const toStates of Object.values(LEGAL_ESCROW_TRANSITIONS)) {
      for (const to of toStates) {
        expect(allStates.has(to)).toBe(true);
      }
    }
  });

  it("total state count is correct (6 escrow states)", () => {
    expect(Object.keys(LEGAL_ESCROW_TRANSITIONS).length).toBe(6);
  });
});

describe("EscrowService — computeEscrowReleaseDeadline", () => {
  it("is service date + the configured escrow window", () => {
    const deadline = computeEscrowReleaseDeadline(new Date(2026, 0, 10, 15), 1);
    expect(deadline.getFullYear()).toBe(2026);
    expect(deadline.getMonth()).toBe(0);
    expect(deadline.getDate()).toBe(11);
    expect(deadline.getHours()).toBe(15);
  });

  it("accepts string dates (serialized booking rows)", () => {
    const deadline = computeEscrowReleaseDeadline("2026-06-15T10:00:00.000Z", 5);
    expect(deadline.getTime()).toBe(
      new Date("2026-06-15T10:00:00.000Z").getTime() + 5 * 24 * 60 * 60 * 1000,
    );
  });

  it("falls back to now when the service date is missing or unparseable", () => {
    const before = Date.now();
    const fromNull = computeEscrowReleaseDeadline(null, 1);
    const fromInvalid = computeEscrowReleaseDeadline("not-a-date", 1);
    const after = Date.now();
    // Missing date + 1 day window ⇒ deadline ≈ now + 1 day (never 1970).
    const dayMs = 24 * 60 * 60 * 1000;
    expect(fromNull.getTime()).toBeGreaterThanOrEqual(before + dayMs - 5000);
    expect(fromNull.getTime()).toBeLessThanOrEqual(after + dayMs + 5000);
    expect(fromInvalid.getTime()).toBeGreaterThanOrEqual(before + dayMs - 5000);
    expect(fromInvalid.getTime()).toBeLessThanOrEqual(after + dayMs + 5000);
  });

  it("clamps invalid or negative windows to 0 days (same day release)", () => {
    const base = new Date(2026, 0, 10, 15);
    expect(computeEscrowReleaseDeadline(base, 0).getTime()).toBe(base.getTime());
    expect(computeEscrowReleaseDeadline(base, -3).getTime()).toBe(base.getTime());
    expect(computeEscrowReleaseDeadline(base, Number.NaN).getTime()).toBe(base.getTime());
    expect(computeEscrowReleaseDeadline(base, 2.9).getTime()).toBe(
      base.getTime() + 2 * dayMsInt(),
    );
  });
});

function dayMsInt(): number {
  return 24 * 60 * 60 * 1000;
}

describe("EscrowService — isUniqueViolation", () => {
  it("recognises Postgres unique_violation (23505)", () => {
    expect(isUniqueViolation({ code: "23505", message: "duplicate key" })).toBe(true);
  });

  it("recognises duplicate-key messages without a code (driver wrappers)", () => {
    expect(isUniqueViolation(new Error("duplicate key value violates unique constraint"))).toBe(true);
  });

  it("rejects every other error shape", () => {
    expect(isUniqueViolation(new Error("connection refused"))).toBe(false);
    expect(isUniqueViolation({ code: "23503" })).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation(undefined)).toBe(false);
    expect(isUniqueViolation("duplicate key")).toBe(false);
  });
});