import { describe, it, expect } from "vitest";
import {
  BOARD_CACHE_TTL_MS,
  LEADERBOARD_RUNTIME_FACTORS,
  applyCurrentUserContext,
  buildBoardCacheSignature,
  clearBoardCache,
  normalizePageSize,
  paginateRows,
  ratingFactorValue,
  resolveEnabledFactors,
  scoreLeaderboard,
  type LeaderboardCandidate,
  type LeaderboardRuntimeFactor,
} from "@/services/LeaderboardService";
import { DEFAULT_CONFIG } from "@/config/platform.config";

const FACTORY_KEYS = ["referrals", "portfolio", "bookings", "ratings"];

const candidates: LeaderboardCandidate[] = [
  { userId: "u-alice", displayName: "Alice", avatarUrl: null },
  { userId: "u-bob", displayName: "Bob", avatarUrl: null },
  { userId: "u-carol", displayName: "Carol", avatarUrl: null },
];

describe("LeaderboardService — factor registry", () => {
  it("registers the four F2/F7 factors", () => {
    expect(LEADERBOARD_RUNTIME_FACTORS.map((f) => f.key)).toEqual(FACTORY_KEYS);
  });

  it("every registry factor exposes a collect function", () => {
    for (const factor of LEADERBOARD_RUNTIME_FACTORS) {
      expect(typeof factor.collect).toBe("function");
    }
  });
});

describe("LeaderboardService — resolveEnabledFactors (config × registry)", () => {
  it("resolves all four factors from the hardcoded defaults", () => {
    const factors = resolveEnabledFactors(DEFAULT_CONFIG.leaderboard?.factors);
    expect(factors.map((f) => f.key)).toEqual(FACTORY_KEYS);

    const referrals = factors.find((f) => f.key === "referrals");
    expect(referrals?.weight).toBe(1);
    expect(referrals?.showRawValue).toBe(false);

    const portfolio = factors.find((f) => f.key === "portfolio");
    expect(portfolio?.weight).toBe(0.5);
    expect(portfolio?.showRawValue).toBe(true);
  });

  it("drops factors the admin disabled", () => {
    const factors = resolveEnabledFactors({
      ...DEFAULT_CONFIG.leaderboard?.factors,
      portfolio: { ...DEFAULT_CONFIG.leaderboard!.factors.portfolio, enabled: false },
      bookings: { ...DEFAULT_CONFIG.leaderboard!.factors.bookings, enabled: false },
    });
    expect(factors.map((f) => f.key)).toEqual(["referrals", "ratings"]);
  });

  it("drops everything when all factors are disabled", () => {
    const allDisabled = Object.fromEntries(
      FACTORY_KEYS.map((key) => [
        key,
        { ...DEFAULT_CONFIG.leaderboard!.factors[key], enabled: false },
      ]),
    );
    expect(resolveEnabledFactors(allDisabled)).toEqual([]);
  });

  it("applies admin overrides for weight, label and showRawValue", () => {
    const factors = resolveEnabledFactors({
      ...DEFAULT_CONFIG.leaderboard?.factors,
      referrals: {
        ...DEFAULT_CONFIG.leaderboard!.factors.referrals,
        weight: 2.5,
        label: "Invites",
        showRawValue: true,
      },
    });
    const referrals = factors.find((f) => f.key === "referrals");
    expect(referrals?.weight).toBe(2.5);
    expect(referrals?.label).toBe("Invites");
    expect(referrals?.showRawValue).toBe(true);
  });

  it("keeps order stable and tolerates config rows the registry does not know", () => {
    const factors = resolveEnabledFactors({
      ...DEFAULT_CONFIG.leaderboard?.factors,
      mystery: {
        key: "mystery",
        enabled: true,
        label: "Mystery",
        description: "",
        weight: 9,
        showRawValue: false,
      },
    });
    expect(factors.map((f) => f.key)).toEqual(FACTORY_KEYS);
  });

  it("falls back to sensible defaults for a registry factor with no config row", () => {
    const custom: LeaderboardRuntimeFactor[] = [
      { key: "referrals", collect: async () => ({}) },
      { key: "blog-posts", collect: async () => ({}) },
    ];
    const factors = resolveEnabledFactors({}, custom);
    expect(factors.map((f) => f.key)).toEqual(["referrals", "blog-posts"]);
    expect(factors[1]).toMatchObject({ weight: 1, showRawValue: false });
  });

  it("drops a custom registry factor the admin disabled", () => {
    const custom: LeaderboardRuntimeFactor[] = [
      { key: "referrals", collect: async () => ({}) },
      { key: "blog-posts", collect: async () => ({}) },
    ];
    const factors = resolveEnabledFactors(
      { "blog-posts": { key: "blog-posts", enabled: false, label: "", description: "", weight: 1, showRawValue: false } },
      custom,
    );
    expect(factors.map((f) => f.key)).toEqual(["referrals"]);
  });
});

describe("LeaderboardService — ratingFactorValue (AVG × ln(1 + count))", () => {
  it("is zero without reviews", () => {
    expect(ratingFactorValue(5, 0)).toBe(0);
    expect(ratingFactorValue(0, 10)).toBe(0);
    expect(ratingFactorValue(Number.NaN, 10)).toBe(0);
  });

  it("matches AVG(rating) × ln(1 + count)", () => {
    expect(ratingFactorValue(5, 9)).toBeCloseTo(5 * Math.log(10), 2);
    expect(ratingFactorValue(4, 0)).toBe(0);
    expect(ratingFactorValue(4, 1)).toBeCloseTo(4 * Math.log(2), 2);
  });

  it("rewards volume with diminishing returns at a fixed average", () => {
    const one = ratingFactorValue(5, 1);
    const ten = ratingFactorValue(5, 10);
    const hundred = ratingFactorValue(5, 100);
    expect(one).toBeLessThan(ten);
    expect(ten).toBeLessThan(hundred);

    // Each additional review is worth less than the previous one (ln growth),
    // so review volume can't be farmed linearly.
    const earlyGain = ratingFactorValue(5, 2) - ratingFactorValue(5, 1);
    const lateGain = ratingFactorValue(5, 101) - ratingFactorValue(5, 100);
    expect(earlyGain).toBeGreaterThan(lateGain);
  });

  it("keeps a strong average with few reviews below a weaker, well-established one", () => {
    const brandNew = ratingFactorValue(5, 1); // 5 × ln 2 ≈ 3.47
    const established = ratingFactorValue(4.8, 50); // 4.8 × ln 51 ≈ 18.8
    expect(brandNew).toBeLessThan(established);
  });
});

describe("LeaderboardService — scoreLeaderboard (weighted scoring + ranking)", () => {
  const factors = [
    { key: "referrals", weight: 1, showRawValue: false },
    { key: "portfolio", weight: 0.5, showRawValue: true },
  ];

  const rawByFactor = {
    referrals: { "u-alice": 100, "u-bob": 50 },
    portfolio: { "u-alice": 4, "u-carol": 10 },
  };

  it("computes score = Σ(weight × raw) and keeps a per-factor breakdown", () => {
    const rows = scoreLeaderboard(candidates, rawByFactor, factors);

    const alice = rows.find((r) => r.userId === "u-alice");
    expect(alice?.breakdown).toEqual({ referrals: 100, portfolio: 2 });
    expect(alice?.score).toBe(102);

    const bob = rows.find((r) => r.userId === "u-bob");
    expect(bob?.score).toBe(50);

    const carol = rows.find((r) => r.userId === "u-carol");
    expect(carol?.score).toBe(5);
  });

  it("ranks by score descending with contiguous 1-based ranks", () => {
    const rows = scoreLeaderboard(candidates, rawByFactor, factors);
    expect(rows.map((r) => r.displayName)).toEqual(["Alice", "Bob", "Carol"]);
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it("keeps users with no activity in any enabled factor at score 0", () => {
    const rows = scoreLeaderboard(candidates, {}, factors);
    expect(rows).toHaveLength(candidates.length);
    for (const row of rows) {
      expect(row.score).toBe(0);
      expect(row.breakdown).toEqual({ referrals: 0, portfolio: 0 });
    }
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it("ranks zero-score members below every positive score", () => {
    const rows = scoreLeaderboard(
      [...candidates, { userId: "u-new", displayName: "New", avatarUrl: null }],
      rawByFactor,
      factors,
    );
    expect(rows.map((r) => r.userId)).toEqual(["u-alice", "u-bob", "u-carol", "u-new"]);
    expect(rows[3].score).toBe(0);
    expect(rows[3].rank).toBe(4);
  });

  it("breaks score ties deterministically on userId", () => {
    const rows = scoreLeaderboard(
      candidates,
      { referrals: { "u-alice": 10, "u-bob": 10, "u-carol": 5 } },
      [{ key: "referrals", weight: 1 }],
    );
    expect(rows.map((r) => r.userId)).toEqual(["u-alice", "u-bob", "u-carol"]);
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it("only attaches raw values for factors with showRawValue", () => {
    const rows = scoreLeaderboard(candidates, rawByFactor, factors);
    const alice = rows.find((r) => r.userId === "u-alice");

    // referrals ships showRawValue: false — its unscaled total never leaves the server.
    expect(alice?.rawValues).toEqual({ portfolio: 4 });
    expect(alice?.rawValues).not.toHaveProperty("referrals");
  });

  it("includes breakdown keys only for the factors passed in (disabled dropped)", () => {
    const rows = scoreLeaderboard(candidates, rawByFactor, [
      { key: "referrals", weight: 1 },
    ]);
    const alice = rows.find((r) => r.userId === "u-alice");
    expect(alice?.breakdown).toEqual({ referrals: 100 });
    expect(alice?.score).toBe(100);
  });

  it("flags the current user's row only when a currentUserId is given", () => {
    const withUser = scoreLeaderboard(candidates, rawByFactor, factors, {
      currentUserId: "u-bob",
    });
    expect(withUser.find((r) => r.userId === "u-bob")?.isCurrentUser).toBe(true);
    expect(withUser.find((r) => r.userId === "u-alice")?.isCurrentUser).toBe(false);

    const anonymous = scoreLeaderboard(candidates, rawByFactor, factors);
    expect(anonymous.every((r) => r.isCurrentUser === undefined)).toBe(true);
  });

  it("produces rows shaped like ILeaderboardRow", () => {
    const rows = scoreLeaderboard(candidates, rawByFactor, factors, {
      currentUserId: "u-alice",
    });
    for (const row of rows) {
      expect(row).toMatchObject({
        rank: expect.any(Number),
        userId: expect.any(String),
        displayName: expect.any(String),
        score: expect.any(Number),
        breakdown: expect.any(Object),
      });
      expect(typeof row.avatarUrl === "string" || row.avatarUrl === null).toBe(true);
    }
  });
});

describe("LeaderboardService — pagination", () => {
  const rows = Array.from({ length: 45 }, (_, i) => ({ id: i + 1 }));

  it("slices rows into the requested page", () => {
    const page2 = paginateRows(rows, 2, 20);
    expect(page2.rows).toHaveLength(20);
    expect(page2.rows[0].id).toBe(21);
    expect(page2.page).toBe(2);
    expect(page2.total).toBe(45);
    expect(page2.totalPages).toBe(3);
  });

  it("returns a partial last page", () => {
    const page3 = paginateRows(rows, 3, 20);
    expect(page3.rows).toHaveLength(5);
    expect(page3.rows[4].id).toBe(45);
  });

  it("clamps out-of-range pages", () => {
    expect(paginateRows(rows, 0, 20).page).toBe(1);
    expect(paginateRows(rows, -3, 20).page).toBe(1);
    expect(paginateRows(rows, 99, 20).page).toBe(3);
    expect(paginateRows(rows, Number.NaN, 20).page).toBe(1);
  });

  it("normalizes invalid page sizes", () => {
    expect(normalizePageSize(0)).toBe(20);
    expect(normalizePageSize(Number.NaN)).toBe(20);
    expect(normalizePageSize(1000)).toBe(100);
    expect(normalizePageSize(7.9)).toBe(7);
    expect(paginateRows(rows, 1, 0).pageSize).toBe(20);
  });

  it("handles an empty board", () => {
    const empty = paginateRows([], 1, 20);
    expect(empty.rows).toEqual([]);
    expect(empty.total).toBe(0);
    expect(empty.totalPages).toBe(1);
  });
});

describe("LeaderboardService — board cache + current-user context (pagination optimisation)", () => {
  const factors = [
    { key: "referrals", weight: 1, showRawValue: false },
    { key: "portfolio", weight: 0.5, showRawValue: true },
  ];
  const rawByFactor = {
    referrals: { "u-alice": 100, "u-bob": 50 },
    portfolio: { "u-alice": 4 },
  };
  const ranked = scoreLeaderboard(candidates, rawByFactor, factors);

  it("exposes a positive cache TTL and a cache-clearing helper", () => {
    expect(BOARD_CACHE_TTL_MS).toBeGreaterThan(0);
    expect(() => clearBoardCache()).not.toThrow();
  });

  it("builds a signature that changes with weight, factors or raw visibility", () => {
    const base = buildBoardCacheSignature(factors);
    expect(buildBoardCacheSignature(factors)).toBe(base);
    expect(
      buildBoardCacheSignature([
        { key: "referrals", weight: 2, showRawValue: false },
        { key: "portfolio", weight: 0.5, showRawValue: true },
      ]),
    ).not.toBe(base);
    expect(buildBoardCacheSignature([{ key: "referrals", weight: 1, showRawValue: false }])).not.toBe(
      base,
    );
    expect(
      buildBoardCacheSignature([
        { key: "referrals", weight: 1, showRawValue: true },
        { key: "portfolio", weight: 0.5, showRawValue: true },
      ]),
    ).not.toBe(base);
  });

  it("finds the signed-in member's rank in the full board, not just the page slice", () => {
    const page2 = paginateRows(ranked, 2, 2);
    // Bob is rank 2 overall but sits on page 1 — the context still reports him.
    const ctx = applyCurrentUserContext(ranked, page2.rows, "u-bob");
    expect(ctx.currentUserRank).toBe(2);
    expect(ctx.currentUserScore).toBe(50);
    // Rows on other pages are not falsely flagged.
    expect(ctx.rows.every((r) => r.isCurrentUser === false)).toBe(true);
  });

  it("flags the row on the member's own page", () => {
    const page1 = paginateRows(ranked, 1, 2);
    const ctx = applyCurrentUserContext(ranked, page1.rows, "u-bob");
    expect(ctx.rows.find((r) => r.userId === "u-bob")?.isCurrentUser).toBe(true);
    expect(ctx.rows.find((r) => r.userId === "u-alice")?.isCurrentUser).toBe(false);
  });

  it("returns null rank/score for anonymous or unknown members", () => {
    const page1 = paginateRows(ranked, 1, 2);
    expect(applyCurrentUserContext(ranked, page1.rows, null).currentUserRank).toBeNull();
    expect(applyCurrentUserContext(ranked, page1.rows, "u-ghost").currentUserRank).toBeNull();
    expect(applyCurrentUserContext(ranked, page1.rows, "u-ghost").currentUserScore).toBeNull();
  });
});
