import { describe, it, expect } from "vitest";
import { BookingStatus } from "@/types";
import { LEGAL_TRANSITIONS } from "@/services/BookingService";

describe("BookingService — State Machine (LEGAL_TRANSITIONS)", () => {
  it("defines legal transitions for all BookingStatus values", () => {
    const allStates = Object.values(BookingStatus);
    for (const state of allStates) {
      expect(LEGAL_TRANSITIONS).toHaveProperty(state);
    }
  });

  it("REQUESTED can transition to ACCEPTED, DECLINED, or CANCELLED", () => {
    expect(LEGAL_TRANSITIONS[BookingStatus.REQUESTED]).toContain(BookingStatus.ACCEPTED);
    expect(LEGAL_TRANSITIONS[BookingStatus.REQUESTED]).toContain(BookingStatus.DECLINED);
    expect(LEGAL_TRANSITIONS[BookingStatus.REQUESTED]).toContain(BookingStatus.CANCELLED);
  });

  it("ACCEPTED can transition to HELD or CANCELLED", () => {
    expect(LEGAL_TRANSITIONS[BookingStatus.ACCEPTED]).toContain(BookingStatus.HELD);
    expect(LEGAL_TRANSITIONS[BookingStatus.ACCEPTED]).toContain(BookingStatus.CANCELLED);
  });

  it("HELD can transition to IN_PROGRESS, CANCELLED, or REFUNDED", () => {
    expect(LEGAL_TRANSITIONS[BookingStatus.HELD]).toContain(BookingStatus.IN_PROGRESS);
    expect(LEGAL_TRANSITIONS[BookingStatus.HELD]).toContain(BookingStatus.CANCELLED);
    expect(LEGAL_TRANSITIONS[BookingStatus.HELD]).toContain(BookingStatus.REFUNDED);
  });

  it("IN_PROGRESS can transition to RELEASED or DISPUTED", () => {
    expect(LEGAL_TRANSITIONS[BookingStatus.IN_PROGRESS]).toContain(BookingStatus.RELEASED);
    expect(LEGAL_TRANSITIONS[BookingStatus.IN_PROGRESS]).toContain(BookingStatus.DISPUTED);
  });

  it("RELEASED is a terminal state", () => {
    expect(LEGAL_TRANSITIONS[BookingStatus.RELEASED]).toEqual([]);
  });

  it("DECLINED, CANCELLED, and REFUNDED are terminal states", () => {
    expect(LEGAL_TRANSITIONS[BookingStatus.DECLINED]).toEqual([]);
    expect(LEGAL_TRANSITIONS[BookingStatus.CANCELLED]).toEqual([]);
    expect(LEGAL_TRANSITIONS[BookingStatus.REFUNDED]).toEqual([]);
  });

  it("DISPUTED can transition to RELEASED or REFUNDED", () => {
    expect(LEGAL_TRANSITIONS[BookingStatus.DISPUTED]).toContain(BookingStatus.RELEASED);
    expect(LEGAL_TRANSITIONS[BookingStatus.DISPUTED]).toContain(BookingStatus.REFUNDED);
  });

  it("every transition target is a valid BookingStatus", () => {
    const allStates = new Set(Object.values(BookingStatus));
    for (const toStates of Object.values(LEGAL_TRANSITIONS)) {
      for (const to of toStates) {
        expect(allStates.has(to)).toBe(true);
      }
    }
  });

  it("no transition cycles back to REQUESTED", () => {
    for (const toStates of Object.values(LEGAL_TRANSITIONS)) {
      expect(toStates).not.toContain(BookingStatus.REQUESTED);
    }
  });
});