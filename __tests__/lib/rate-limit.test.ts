import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  consumeRateWindow,
  __resetRateWindowsForTests,
} from "@/lib/rate-limit";

const OPTS = { limit: 3, windowMs: 60_000 };

describe("lib/rate-limit — consumeRateWindow", () => {
  beforeEach(() => {
    __resetRateWindowsForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows attempts under the limit and reports remaining", () => {
    const now = 1_000_000;
    const first = consumeRateWindow("user-1", OPTS, now);
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(2);

    const second = consumeRateWindow("user-1", OPTS, now + 10);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(1);
  });

  it("denies the attempt over the limit with a positive retryAfterMs", () => {
    const now = 2_000_000;
    consumeRateWindow("user-1", OPTS, now);
    consumeRateWindow("user-1", OPTS, now + 1);
    consumeRateWindow("user-1", OPTS, now + 2);

    const denied = consumeRateWindow("user-1", OPTS, now + 3);
    expect(denied.allowed).toBe(false);
    expect(denied.remaining).toBe(0);
    expect(denied.retryAfterMs).toBeGreaterThan(0);
    expect(denied.retryAfterMs).toBeLessThanOrEqual(OPTS.windowMs);
  });

  it("does not record denied attempts (wait isn't punished further)", () => {
    const now = 3_000_000;
    consumeRateWindow("user-1", OPTS, now); // t0
    consumeRateWindow("user-1", OPTS, now + 10_000); // t1
    consumeRateWindow("user-1", OPTS, now + 20_000); // t2
    expect(consumeRateWindow("user-1", OPTS, now + 21_000).allowed).toBe(false);

    // t0 expires (windowMs after t0) — exactly `limit - 1` slots remain free
    // because the denied attempt was never pushed.
    const afterWindow = consumeRateWindow("user-1", OPTS, now + 60_001);
    expect(afterWindow.allowed).toBe(true);
    expect(afterWindow.remaining).toBe(0);
    // Still only 3 recorded attempts in the live window (t1, t2, new one)
    expect(consumeRateWindow("user-1", OPTS, now + 60_002).allowed).toBe(false);
  });

  it("frees capacity once the oldest attempt ages out of the window", () => {
    const now = 4_000_000;
    consumeRateWindow("user-1", OPTS, now);
    consumeRateWindow("user-1", OPTS, now);
    consumeRateWindow("user-1", OPTS, now);
    expect(consumeRateWindow("user-1", OPTS, now + 1).allowed).toBe(false);

    const afterExpiry = consumeRateWindow("user-1", OPTS, now + 60_001);
    expect(afterExpiry.allowed).toBe(true);
    expect(afterExpiry.remaining).toBe(2);
  });

  it("keeps budgets isolated per key", () => {
    const now = 5_000_000;
    consumeRateWindow("user-a", OPTS, now);
    consumeRateWindow("user-a", OPTS, now);
    consumeRateWindow("user-a", OPTS, now);
    expect(consumeRateWindow("user-a", OPTS, now).allowed).toBe(false);
    // A different key is unaffected
    expect(consumeRateWindow("user-b", OPTS, now).allowed).toBe(true);
  });

  it("treats limit <= 0 or windowMs <= 0 as disabled (always allowed)", () => {
    expect(consumeRateWindow("u", { limit: 0, windowMs: 60_000 }, 1).allowed).toBe(true);
    expect(consumeRateWindow("u", { limit: -5, windowMs: 60_000 }, 1).allowed).toBe(true);
    expect(consumeRateWindow("u", { limit: 3, windowMs: 0 }, 1).allowed).toBe(true);
    expect(consumeRateWindow("u", { limit: NaN, windowMs: 60_000 }, 1).allowed).toBe(true);
  });

  it("retryAfterMs counts down to the window boundary", () => {
    const now = 6_000_000;
    consumeRateWindow("u", OPTS, now);
    consumeRateWindow("u", OPTS, now);
    consumeRateWindow("u", OPTS, now);

    const denied = consumeRateWindow("u", OPTS, now + 30_000);
    expect(denied.allowed).toBe(false);
    // 30s already elapsed → ~30s until t0 ages out
    expect(denied.retryAfterMs).toBeGreaterThan(0);
    expect(denied.retryAfterMs).toBeLessThanOrEqual(30_001);
  });

  it("reset clears all buckets", () => {
    const now = 7_000_000;
    consumeRateWindow("u", OPTS, now);
    consumeRateWindow("u", OPTS, now);
    consumeRateWindow("u", OPTS, now);
    expect(consumeRateWindow("u", OPTS, now).allowed).toBe(false);
    __resetRateWindowsForTests();
    expect(consumeRateWindow("u", OPTS, now).allowed).toBe(true);
  });
});
