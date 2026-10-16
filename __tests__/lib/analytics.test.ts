import { describe, expect, it } from "vitest";
import {
  buildDayAxis,
  buildInsights,
  fillSeries,
  formatPct,
  movingAverage,
  normalizeRange,
  pctChange,
} from "@/lib/analytics";

describe("buildDayAxis", () => {
  it("builds an inclusive UTC axis", () => {
    const axis = buildDayAxis(new Date("2026-10-14T12:00:00Z"), new Date("2026-10-16T01:00:00Z"));
    expect(axis).toEqual(["2026-10-14", "2026-10-15", "2026-10-16"]);
  });

  it("returns empty for reversed or invalid ranges", () => {
    expect(buildDayAxis(new Date("2026-10-16T00:00:00Z"), new Date("2026-10-14T00:00:00Z"))).toEqual([]);
    expect(buildDayAxis(new Date("bad"), new Date())).toEqual([]);
  });
});

describe("fillSeries + movingAverage", () => {
  it("fills missing days with zero", () => {
    const out = fillSeries(["2026-10-14", "2026-10-15"], { "2026-10-14": 3 });
    expect(out).toEqual([
      { day: "2026-10-14", value: 3 },
      { day: "2026-10-15", value: 0 },
    ]);
  });

  it("averages the trailing window", () => {
    const s = [
      { day: "a", value: 2 },
      { day: "b", value: 4 },
      { day: "c", value: 6 },
    ];
    const avg = movingAverage(s, 2);
    expect(avg[0].value).toBe(2);
    expect(avg[1].value).toBe(3);
    expect(avg[2].value).toBe(5);
  });
});

describe("pctChange + formatPct", () => {
  it("returns null without a basis", () => {
    expect(pctChange(5, 0)).toBeNull();
    expect(pctChange(5, null)).toBeNull();
  });

  it("computes fractional change", () => {
    expect(pctChange(120, 100)).toBeCloseTo(0.2);
    expect(formatPct(0.2)).toBe("+20.0%");
    expect(formatPct(-0.055)).toBe("−5.5%");
    expect(formatPct(null)).toBe("n/a");
  });
});

describe("buildInsights", () => {
  const base = {
    rangeDays: 30,
    bookings: 20,
    bookingsPrev: 10,
    gmvKobo: 2000000,
    gmvPrevKobo: 1000000,
    signups: 15,
    signupsPrev: 10,
    releaseRate: 0.9,
    disputeRate: 0.01,
    minBookings: 5,
    surgeThreshold: 0.2,
  };

  it("emits demand, revenue, acquisition and fulfilment commentary", () => {
    const insights = buildInsights(base);
    expect(insights.length).toBeGreaterThanOrEqual(4);
    expect(insights[0].title).toContain("surging");
    expect(insights[0].tone).toBe("success");
  });

  it("returns a quiet-period note when there is no activity", () => {
    const insights = buildInsights({ ...base, bookings: 0, gmvKobo: 0, signups: 0 });
    expect(insights).toHaveLength(1);
    expect(insights[0].title).toContain("Quiet period");
  });

  it("flags elevated dispute rates", () => {
    const insights = buildInsights({ ...base, disputeRate: 0.1 });
    expect(insights.some((i) => i.tone === "danger" && i.title.includes("Dispute"))).toBe(true);
  });

  it("warns on weak fulfilment", () => {
    const insights = buildInsights({ ...base, releaseRate: 0.2 });
    const fulfil = insights.find((i) => i.title.includes("Fulfilment"));
    expect(fulfil?.tone).toBe("warning");
  });
});

describe("normalizeRange", () => {
  it("accepts allowed windows and falls back otherwise", () => {
    expect(normalizeRange("90", 30)).toBe(90);
    expect(normalizeRange("13", 30)).toBe(30);
    expect(normalizeRange(undefined, 7)).toBe(7);
    expect(normalizeRange(["365"], 30)).toBe(365);
  });
});
