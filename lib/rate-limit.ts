/**
 * Generic, dependency-free in-memory sliding-window rate limiter.
 *
 * Used for per-caller budgets on API endpoints that fan out to third-party
 * APIs (e.g. Google Drive previews) where the shared provider-side throttle
 * alone would let a single user burn the whole project budget. State is
 * per-process/per-isolate — on serverless each isolate gets its own buckets,
 * so limits stay conservative (documented caveat, same as lib/drive.ts).
 *
 * Deliberately generic: any route can budget any key (user id, IP, session)
 * without pulling in external rate-limit packages.
 */

export interface RateWindowCheck {
  allowed: boolean;
  /** Milliseconds the caller must wait before the next attempt can succeed. 0 when allowed. */
  retryAfterMs: number;
  /** Attempts still available in the current window (0 when denied). */
  remaining: number;
}

interface RateWindowOptions {
  /** Max attempts per window. Values <= 0 disable the limiter (always allowed). */
  limit: number;
  /** Window length in ms. */
  windowMs: number;
}

/** key -> attempt timestamps (ms) within the current window. */
const buckets = new Map<string, number[]>();

/** Opportunistic bound so long-lived processes don't accumulate dead keys. */
const MAX_KEYS = 5_000;

/** Test hook: clear all buckets between cases. */
export function __resetRateWindowsForTests(): void {
  buckets.clear();
}

function prune(entries: number[], now: number, windowMs: number): number[] {
  const cutoff = now - windowMs;
  let i = 0;
  while (i < entries.length && entries[i] <= cutoff) i++;
  return i > 0 ? entries.slice(i) : entries;
}

function sweep(now: number): void {
  if (buckets.size < MAX_KEYS) return;
  for (const [key, entries] of buckets) {
    if (entries.length === 0 || entries[entries.length - 1] <= now) {
      buckets.delete(key);
    }
  }
  // Still oversized (all keys recent): drop the oldest buckets wholesale —
  // fairness is irrelevant at this point, the limiter must stay bounded.
  if (buckets.size >= MAX_KEYS) buckets.clear();
}

/**
 * Record an attempt against `key` if the window allows it.
 * Denied attempts are NOT recorded (waiting callers aren't punished further).
 * `now` is injectable for deterministic tests.
 */
export function consumeRateWindow(
  key: string,
  opts: RateWindowOptions,
  now: number = Date.now(),
): RateWindowCheck {
  const { limit, windowMs } = opts;
  if (!Number.isFinite(limit) || limit <= 0 || !Number.isFinite(windowMs) || windowMs <= 0) {
    return { allowed: true, retryAfterMs: 0, remaining: Number.POSITIVE_INFINITY };
  }

  const current = prune(buckets.get(key) ?? [], now, windowMs);

  if (current.length >= limit) {
    buckets.set(key, current);
    sweep(now);
    const retryAfterMs = Math.max(1, current[0] + windowMs - now + 1);
    return { allowed: false, retryAfterMs, remaining: 0 };
  }

  current.push(now);
  buckets.set(key, current);
  sweep(now);
  return {
    allowed: true,
    retryAfterMs: 0,
    remaining: Math.max(0, limit - current.length),
  };
}
