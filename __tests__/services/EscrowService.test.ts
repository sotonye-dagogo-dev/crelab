import { describe, it, expect } from "vitest";
import { EscrowState } from "@/types";
import { LEGAL_ESCROW_TRANSITIONS } from "@/services/EscrowService";

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