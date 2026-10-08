import { describe, it, expect } from "vitest";
import {
  DEFAULT_FIRST_HUNDRED,
  isFoundingMember,
  normalizeFirstHundredLimit,
  resolveFirstHundredConfig,
  registrationRankFrom,
} from "@/services/EarlyMemberService";
import { DEFAULT_CONFIG } from "@/config/platform.config";

describe("EarlyMemberService — Founding-100 config defaults", () => {
  it("ships a firstHundred default with the badge enabled", () => {
    expect(DEFAULT_CONFIG.firstHundred?.enabled).toBe(true);
    expect(DEFAULT_CONFIG.firstHundred?.limit).toBe(100);
    expect(DEFAULT_CONFIG.firstHundred?.badgeLabel).toBe("Founding 100");
  });

  it("exposes the same values as DEFAULT_FIRST_HUNDRED", () => {
    expect(DEFAULT_FIRST_HUNDRED).toEqual(DEFAULT_CONFIG.firstHundred);
  });
});

describe("EarlyMemberService — isFoundingMember (rank <= limit)", () => {
  it("qualifies every rank from 1 to the limit", () => {
    expect(isFoundingMember(1, 100)).toBe(true);
    expect(isFoundingMember(42, 100)).toBe(true);
    expect(isFoundingMember(100, 100)).toBe(true);
  });

  it("rejects the rank one past the limit", () => {
    expect(isFoundingMember(101, 100)).toBe(false);
  });

  it("honours a custom limit", () => {
    expect(isFoundingMember(25, 25)).toBe(true);
    expect(isFoundingMember(26, 25)).toBe(false);
  });

  it("never qualifies without a rank", () => {
    expect(isFoundingMember(null, 100)).toBe(false);
    expect(isFoundingMember(undefined, 100)).toBe(false);
    expect(isFoundingMember(Number.NaN, 100)).toBe(false);
  });

  it("never qualifies at rank 0 or with limit 0", () => {
    expect(isFoundingMember(0, 100)).toBe(false);
    expect(isFoundingMember(1, 0)).toBe(false);
  });
});

describe("EarlyMemberService — config resolution fallbacks", () => {
  it("returns the defaults when no config row exists", () => {
    expect(resolveFirstHundredConfig(null)).toEqual(DEFAULT_FIRST_HUNDRED);
    expect(resolveFirstHundredConfig(undefined)).toEqual(DEFAULT_FIRST_HUNDRED);
    expect(resolveFirstHundredConfig({})).toEqual(DEFAULT_FIRST_HUNDRED);
  });

  it("overrides defaults with provided values", () => {
    const resolved = resolveFirstHundredConfig({
      enabled: false,
      limit: 25,
      badgeLabel: "Top 25",
      showRank: false,
    });
    expect(resolved.enabled).toBe(false);
    expect(resolved.limit).toBe(25);
    expect(resolved.badgeLabel).toBe("Top 25");
    expect(resolved.showRank).toBe(false);
    expect(resolved.title).toBe(DEFAULT_FIRST_HUNDRED.title);
  });

  it("falls back to the default limit for invalid values", () => {
    expect(normalizeFirstHundredLimit(-5)).toBe(DEFAULT_FIRST_HUNDRED.limit);
    expect(normalizeFirstHundredLimit(0)).toBe(DEFAULT_FIRST_HUNDRED.limit);
    expect(normalizeFirstHundredLimit(Number.NaN)).toBe(DEFAULT_FIRST_HUNDRED.limit);
    expect(normalizeFirstHundredLimit(null)).toBe(DEFAULT_FIRST_HUNDRED.limit);
  });

  it("floors fractional limits", () => {
    expect(normalizeFirstHundredLimit(100.9)).toBe(100);
  });
});

describe("EarlyMemberService — registrationRankFrom (window-function mirror)", () => {
  const rows = [
    { id: "u-3", createdAt: "2026-01-03T00:00:00.000Z" },
    { id: "u-1", createdAt: "2026-01-01T00:00:00.000Z" },
    { id: "u-2", createdAt: "2026-01-02T00:00:00.000Z" },
  ];

  it("ranks by created_at ascending, 1-based", () => {
    expect(registrationRankFrom(rows, "u-1")).toBe(1);
    expect(registrationRankFrom(rows, "u-2")).toBe(2);
    expect(registrationRankFrom(rows, "u-3")).toBe(3);
  });

  it("breaks createdAt ties deterministically on id", () => {
    const tied = [
      { id: "zzz", createdAt: new Date("2026-05-01T00:00:00.000Z") },
      { id: "aaa", createdAt: new Date("2026-05-01T00:00:00.000Z") },
      { id: "mmm", createdAt: new Date("2026-05-01T00:00:00.000Z") },
    ];
    expect(registrationRankFrom(tied, "aaa")).toBe(1);
    expect(registrationRankFrom(tied, "mmm")).toBe(2);
    expect(registrationRankFrom(tied, "zzz")).toBe(3);
  });

  it("accepts Date objects and ISO strings interchangeably", () => {
    const mixed = [
      { id: "a", createdAt: new Date("2026-02-01T00:00:00.000Z") },
      { id: "b", createdAt: "2026-01-01T00:00:00.000Z" },
    ];
    expect(registrationRankFrom(mixed, "b")).toBe(1);
    expect(registrationRankFrom(mixed, "a")).toBe(2);
  });

  it("returns null for a user that is not in the list", () => {
    expect(registrationRankFrom(rows, "missing")).toBeNull();
    expect(registrationRankFrom([], "u-1")).toBeNull();
  });

  it("does not mutate the input rows", () => {
    const before = rows.map((r) => r.id).join(",");
    registrationRankFrom(rows, "u-1");
    expect(rows.map((r) => r.id).join(",")).toBe(before);
  });
});
