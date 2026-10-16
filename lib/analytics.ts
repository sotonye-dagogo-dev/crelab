/* ── Analytics pure helpers (no DB, no I/O — unit-tested) ── */

export interface IDayPoint {
  day: string;
  value: number;
}

export interface IInsight {
  tone: "success" | "warning" | "danger" | "info";
  title: string;
  body: string;
}

/** Builds a continuous YYYY-MM-DD day axis between `from` and `to` (inclusive, UTC). */
export function buildDayAxis(from: Date, to: Date): string[] {
  const days: string[] = [];
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime()) || cursor > end) return [];
  // Cap at 400 days so a bad range can never explode the series.
  for (let i = 0; i < 400 && cursor <= end; i++) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

/** Fills sparse day values onto a continuous axis (missing days -> 0). */
export function fillSeries(axis: string[], values: Map<string, number> | Record<string, number>): IDayPoint[] {
  const get = (day: string): number => {
    const v = values instanceof Map ? values.get(day) : values[day];
    return typeof v === "number" && Number.isFinite(v) ? v : 0;
  };
  return axis.map((day) => ({ day, value: get(day) }));
}

/** Simple trailing moving average (window N, min 1). Leading points average what exists. */
export function movingAverage(series: IDayPoint[], window = 7): IDayPoint[] {
  const w = Math.max(1, Math.min(30, Math.floor(window) || 7));
  return series.map((p, i) => {
    const slice = series.slice(Math.max(0, i - w + 1), i + 1);
    const avg = slice.reduce((acc, s) => acc + s.value, 0) / slice.length;
    return { day: p.day, value: Math.round(avg * 100) / 100 };
  });
}

/** Fractional change of `current` vs `previous`. Null when previous is 0/undefined (no basis). */
export function pctChange(current: number, previous: number | null | undefined): number | null {
  if (previous === null || previous === undefined || previous === 0) return null;
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  return (current - previous) / Math.abs(previous);
}

export function formatPct(frac: number | null): string {
  if (frac === null) return "n/a";
  const sign = frac > 0 ? "+" : frac < 0 ? "−" : "";
  return `${sign}${(Math.abs(frac) * 100).toFixed(1)}%`;
}

export interface IInsightInput {
  rangeDays: number;
  bookings: number;
  bookingsPrev: number;
  gmvKobo: number;
  gmvPrevKobo: number;
  signups: number;
  signupsPrev: number;
  releaseRate: number | null;
  disputeRate: number | null;
  minBookings: number;
  surgeThreshold: number;
}

function trendWord(frac: number | null, surge: number): "surging" | "growing" | "steady" | "softening" | "declining" {
  if (frac === null) return "steady";
  if (frac >= surge) return "surging";
  if (frac > 0.02) return "growing";
  if (frac >= -0.02) return "steady";
  if (frac >= -surge) return "softening";
  return "declining";
}

/**
 * Generates human-readable, data-driven commentary for the analytics page.
 * Pure + deterministic: same inputs always produce the same insights.
 */
export function buildInsights(input: IInsightInput): IInsight[] {
  const insights: IInsight[] = [];
  const bookingDelta = pctChange(input.bookings, input.bookingsPrev);
  const gmvDelta = pctChange(input.gmvKobo, input.gmvPrevKobo);
  const signupDelta = pctChange(input.signups, input.signupsPrev);

  if (input.bookings < input.minBookings && input.gmvKobo === 0 && input.signups === 0) {
    insights.push({
      tone: "info",
      title: "Quiet period — no activity yet",
      body: `No bookings, revenue or signups were recorded in the last ${input.rangeDays} days. Figures below reflect lifetime totals for context.`,
    });
    return insights;
  }

  const bookingTrend = trendWord(bookingDelta, input.surgeThreshold);
  insights.push({
    tone: bookingDelta !== null && bookingDelta < -input.surgeThreshold ? "warning" : bookingDelta !== null && bookingDelta > 0 ? "success" : "info",
    title: `Demand is ${bookingTrend} (${formatPct(bookingDelta)} vs prior ${input.rangeDays}d)`,
    body:
      input.bookings >= input.minBookings
        ? `${input.bookings} bookings in the last ${input.rangeDays} days, compared with ${input.bookingsPrev} in the preceding window.`
        : `Only ${input.bookings} bookings in the last ${input.rangeDays} days (below the ${input.minBookings}-booking commentary threshold), so treat the ${formatPct(bookingDelta)} move with caution.`,
  });

  const gmvTrend = trendWord(gmvDelta, input.surgeThreshold);
  insights.push({
    tone: gmvDelta !== null && gmvDelta < -input.surgeThreshold ? "warning" : gmvDelta !== null && gmvDelta > 0 ? "success" : "info",
    title: `Revenue is ${gmvTrend} (${formatPct(gmvDelta)} vs prior ${input.rangeDays}d)`,
    body: `Gross merchandise volume moved in line with demand. A revenue trend that diverges from the booking trend usually points at a shift in average booking value — check the category mix below.`,
  });

  const signupTrend = trendWord(signupDelta, input.surgeThreshold);
  insights.push({
    tone: signupDelta !== null && signupDelta > 0 ? "success" : "info",
    title: `Acquisition is ${signupTrend} (${formatPct(signupDelta)} vs prior ${input.rangeDays}d)`,
    body: `${input.signups} new accounts in the last ${input.rangeDays} days vs ${input.signupsPrev} before. If signups grow while bookings stay flat, top-of-funnel conversion needs attention.`,
  });

  if (input.releaseRate !== null) {
    insights.push({
      tone: input.releaseRate >= 0.8 ? "success" : input.releaseRate >= 0.5 ? "info" : "warning",
      title: `Fulfilment health: ${(input.releaseRate * 100).toFixed(0)}% of decided bookings released`,
      body:
        input.releaseRate >= 0.8
          ? "Most completed work is being approved and paid out — escrow is flowing as designed."
          : "A large share of decided bookings ends in refunds or disputes. Review dispute reasons before scaling demand.",
    });
  }

  if (input.disputeRate !== null && input.disputeRate > 0.05) {
    insights.push({
      tone: "danger",
      title: `Dispute rate is elevated (${(input.disputeRate * 100).toFixed(1)}% of bookings)`,
      body: "More than 1 in 20 bookings ends in dispute. Prioritise dispute triage and provider quality checks this period.",
    });
  }

  return insights;
}

/** Normalises the `range` query param to an allowed day window. */
export function normalizeRange(raw: string | string[] | undefined, fallback: number, allowed: number[] = [7, 30, 90, 365]): number {
  const n = Number.parseInt(Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? ""), 10);
  if (allowed.includes(n)) return n;
  return allowed.includes(fallback) ? fallback : 30;
}
