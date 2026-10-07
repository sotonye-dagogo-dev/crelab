import { describe, it, expect } from "vitest";
import {
  REFERRAL_SOURCE,
  generateReferralCode,
  normalizeReferralCode,
  resolveReferralEvents,
} from "@/services/ReferralService";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

describe("ReferralService — code generation", () => {
  it("issues an 8-character code from the unambiguous alphabet", () => {
    const code = generateReferralCode();
    expect(code).toHaveLength(8);
    for (const char of code) {
      expect(CODE_ALPHABET).toContain(char);
    }
  });

  it("supports a custom length", () => {
    expect(generateReferralCode(12)).toHaveLength(12);
  });

  it("produces different codes across calls", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateReferralCode()));
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe("ReferralService — normalizeReferralCode (cookie input guard)", () => {
  it("accepts a well-formed code", () => {
    expect(normalizeReferralCode("ABCD2345")).toBe("ABCD2345");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeReferralCode("  ABCD2345\n")).toBe("ABCD2345");
  });

  it("keeps URL-safe variants (cookie values are URL-encoded)", () => {
    expect(normalizeReferralCode("ab_cd-12")).toBe("ab_cd-12");
  });

  it("rejects short, long, empty and non-string values", () => {
    expect(normalizeReferralCode("abc")).toBeNull();
    expect(normalizeReferralCode("a".repeat(65))).toBeNull();
    expect(normalizeReferralCode("")).toBeNull();
    expect(normalizeReferralCode(null)).toBeNull();
    expect(normalizeReferralCode(undefined)).toBeNull();
  });

  it("rejects values with spaces or special characters", () => {
    expect(normalizeReferralCode("AB CD2345")).toBeNull();
    expect(normalizeReferralCode("<script>")).toBeNull();
    expect(normalizeReferralCode("ABCD2345; DROP")).toBeNull();
  });
});

describe("ReferralService — resolveReferralEvents (degree resolution)", () => {
  const direct = {
    code: "ABCD2345",
    codeOwnerId: "referrer-1",
    inviteeId: "invitee-1",
    directPoints: 100,
    secondDegreePoints: 25,
  };

  it("writes a degree-1 row owned by the code owner", () => {
    const events = resolveReferralEvents(direct);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      userId: "referrer-1",
      inviteeId: "invitee-1",
      referrerId: "referrer-1",
      code: "ABCD2345",
      degree: 1,
      points: 100,
      source: REFERRAL_SOURCE,
    });
  });

  it("adds a degree-2 row for the referrer's own referrer", () => {
    const events = resolveReferralEvents({
      ...direct,
      secondDegreeEarnerId: "grandparent-1",
    });

    expect(events).toHaveLength(2);

    const [first, second] = events;
    expect(first.degree).toBe(1);
    expect(first.userId).toBe("referrer-1");
    expect(first.points).toBe(100);

    expect(second.degree).toBe(2);
    expect(second.userId).toBe("grandparent-1");
    // referrerId always names the direct link owner, across both degrees.
    expect(second.referrerId).toBe("referrer-1");
    expect(second.inviteeId).toBe("invitee-1");
    expect(second.code).toBe("ABCD2345");
    expect(second.points).toBe(25);
    expect(second.source).toBe(REFERRAL_SOURCE);
  });

  it("blocks self-referral server-side (no rows)", () => {
    const events = resolveReferralEvents({
      ...direct,
      codeOwnerId: "invitee-1",
      secondDegreeEarnerId: "grandparent-1",
    });
    expect(events).toEqual([]);
  });

  it("skips degree 2 when the second-degree earner is the invitee", () => {
    const events = resolveReferralEvents({
      ...direct,
      secondDegreeEarnerId: "invitee-1",
    });
    expect(events).toHaveLength(1);
    expect(events[0].degree).toBe(1);
  });

  it("skips degree 2 when the second-degree earner already earned degree 1", () => {
    const events = resolveReferralEvents({
      ...direct,
      secondDegreeEarnerId: "referrer-1",
    });
    expect(events).toHaveLength(1);
    expect(events[0].degree).toBe(1);
  });

  it("skips degree 2 when no parent referral exists", () => {
    const events = resolveReferralEvents({ ...direct, secondDegreeEarnerId: null });
    expect(events).toHaveLength(1);
  });

  it("never produces two rows for the same earner", () => {
    const events = resolveReferralEvents({
      ...direct,
      secondDegreeEarnerId: "grandparent-1",
    });
    const earners = events.map((event) => `${event.userId}:${event.degree}`);
    expect(new Set(earners).size).toBe(earners.length);
  });

  it("returns nothing for missing identifiers", () => {
    expect(resolveReferralEvents({ ...direct, code: "" })).toEqual([]);
    expect(resolveReferralEvents({ ...direct, codeOwnerId: "" })).toEqual([]);
    expect(resolveReferralEvents({ ...direct, inviteeId: "" })).toEqual([]);
  });
});
