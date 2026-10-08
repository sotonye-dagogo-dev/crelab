import { describe, it, expect } from "vitest";
import {
  countdownParts,
  fromDatetimeLocalValue,
  isWidgetExpired,
  padUnit,
  selectWidgetsForArea,
  toDatetimeLocalValue,
} from "@/lib/countdown";
import {
  formatLandingStatValue,
  getOrderedStatItems,
  resolveLandingStatValue,
} from "@/lib/landing-stats";
import {
  COUNTDOWN_ICON_NAMES,
  DEFAULT_COUNTDOWN_ICON,
  resolveCountdownIcon,
  resolveCountdownIconNames,
} from "@/lib/countdown-icons";
import { DEFAULT_CONFIG } from "@/config/platform.config";
import type { ICountdownWidget } from "@/types";

function widget(overrides: Partial<ICountdownWidget> = {}): ICountdownWidget {
  return {
    id: "w1",
    enabled: true,
    title: "Launch",
    endsAt: "2099-01-01T00:00:00.000Z",
    areas: ["landing"],
    orderIndex: 0,
    ...overrides,
  };
}

describe("countdown — area selection", () => {
  it("keeps only widgets whose areas include the requested slot", () => {
    const widgets = [
      widget({ id: "landing-only", areas: ["landing"], orderIndex: 0 }),
      widget({ id: "explore-only", areas: ["explore"], orderIndex: 1 }),
      widget({ id: "both", areas: ["landing", "explore"], orderIndex: 2 }),
    ];

    const landing = selectWidgetsForArea(widgets, "landing").map((w) => w.id);
    const explore = selectWidgetsForArea(widgets, "explore").map((w) => w.id);

    expect(landing).toEqual(["landing-only", "both"]);
    expect(explore).toEqual(["explore-only", "both"]);
  });

  it("drops disabled widgets", () => {
    const widgets = [
      widget({ id: "on", enabled: true }),
      widget({ id: "off", enabled: false, orderIndex: 1 }),
    ];

    expect(selectWidgetsForArea(widgets, "landing").map((w) => w.id)).toEqual(["on"]);
  });

  it("orders by orderIndex with a deterministic id tie-break", () => {
    const widgets = [
      widget({ id: "c", orderIndex: 2 }),
      widget({ id: "b", orderIndex: 1 }),
      widget({ id: "a", orderIndex: 1 }),
    ];

    expect(selectWidgetsForArea(widgets, "landing").map((w) => w.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("does not mutate the source array", () => {
    const widgets = [widget({ id: "b", orderIndex: 2 }), widget({ id: "a", orderIndex: 1 })];
    selectWidgetsForArea(widgets, "landing");

    expect(widgets.map((w) => w.id)).toEqual(["b", "a"]);
  });

  it("returns nothing for an empty slot", () => {
    expect(selectWidgetsForArea([], "landing")).toEqual([]);
    expect(
      selectWidgetsForArea(DEFAULT_CONFIG.countdown!.widgets, "explore"),
    ).toEqual([]);
  });
});

describe("countdown — expiry", () => {
  it("excludes expired widgets once a clock is supplied", () => {
    const widgets = [
      widget({ id: "future", endsAt: "2099-01-01T00:00:00.000Z" }),
      widget({ id: "past", endsAt: "2020-01-01T00:00:00.000Z", orderIndex: 1 }),
    ];

    const visible = selectWidgetsForArea(widgets, "landing", Date.parse("2026-01-01T00:00:00.000Z"));

    expect(visible.map((w) => w.id)).toEqual(["future"]);
  });

  it("keeps every enabled widget when no clock is supplied (first render)", () => {
    const widgets = [widget({ id: "past", endsAt: "2020-01-01T00:00:00.000Z" })];

    expect(selectWidgetsForArea(widgets, "landing").map((w) => w.id)).toEqual(["past"]);
  });

  it("treats the exact end moment as expired", () => {
    const target = Date.parse("2026-05-05T12:00:00.000Z");

    expect(isWidgetExpired(widget({ endsAt: "2026-05-05T12:00:00.000Z" }), target)).toBe(true);
    expect(isWidgetExpired(widget({ endsAt: "2026-05-05T12:00:01.000Z" }), target)).toBe(false);
  });

  it("treats an unparseable end date as expired", () => {
    expect(isWidgetExpired(widget({ endsAt: "not-a-date" }), Date.now())).toBe(true);
  });
});

describe("countdown — remaining time", () => {
  it("splits a future moment into days, hours, minutes and seconds", () => {
    const now = Date.parse("2026-01-01T00:00:00.000Z");
    const endsAt = "2026-01-02T03:04:05.000Z";

    expect(countdownParts(endsAt, now)).toEqual({
      days: 1,
      hours: 3,
      minutes: 4,
      seconds: 5,
    });
  });

  it("clamps elapsed widgets to zeros instead of going negative", () => {
    const now = Date.parse("2026-01-10T00:00:00.000Z");

    expect(countdownParts("2026-01-01T00:00:00.000Z", now)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
  });

  it("pads single-digit units", () => {
    expect(padUnit(7)).toBe("07");
    expect(padUnit(12)).toBe("12");
    expect(padUnit(45)).toBe("45");
  });
});

describe("countdown — datetime-local conversion", () => {
  it("round-trips an ISO value through the local input format", () => {
    const iso = "2030-06-15T12:30:00.000Z";
    const local = toDatetimeLocalValue(iso);

    expect(local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(fromDatetimeLocalValue(local)).toBe(iso);
  });

  it("returns an empty string for unparseable input", () => {
    expect(toDatetimeLocalValue("")).toBe("");
    expect(toDatetimeLocalValue("nope")).toBe("");
    expect(fromDatetimeLocalValue("")).toBe("");
    expect(fromDatetimeLocalValue("nope")).toBe("");
  });
});

describe("landing stats — ordering", () => {
  it("keeps enabled items only, ordered by orderIndex", () => {
    const items = getOrderedStatItems(DEFAULT_CONFIG.landingStats);

    expect(items.map((i) => i.id)).toEqual(["creators", "bookings", "avgRating"]);
  });

  it("returns an empty list when the config is missing", () => {
    expect(getOrderedStatItems(undefined)).toEqual([]);
    expect(getOrderedStatItems(null)).toEqual([]);
    expect(getOrderedStatItems({ items: {} })).toEqual([]);
  });
});

describe("landing stats — formatting", () => {
  it("formats counts, compact values and ratings", () => {
    expect(formatLandingStatValue(1234, "count")).toBe("1,234");
    expect(formatLandingStatValue(1200, "compact")).toBe("1.2K");
    expect(formatLandingStatValue(5000, "compact")).toBe("5K");
    expect(formatLandingStatValue(4.87, "rating")).toBe("4.9");
    expect(formatLandingStatValue(0, "count")).toBe("0");
  });

  it("returns null for missing or invalid aggregates", () => {
    expect(formatLandingStatValue(null, "count")).toBeNull();
    expect(formatLandingStatValue(undefined, "compact")).toBeNull();
    expect(formatLandingStatValue(Number.NaN, "rating")).toBeNull();
    expect(formatLandingStatValue(Number.POSITIVE_INFINITY, "count")).toBeNull();
  });

  it("renders real aggregates when they are available", () => {
    const [creators, bookings, rating] = getOrderedStatItems(DEFAULT_CONFIG.landingStats);

    expect(
      resolveLandingStatValue(creators, { providers: 1234, bookings: 5000, reviews: 4.87 }),
    ).toBe("1.2K");
    expect(
      resolveLandingStatValue(bookings, { providers: 1234, bookings: 5000, reviews: 4.87 }),
    ).toBe("5K");
    expect(
      resolveLandingStatValue(rating, { providers: 1234, bookings: 5000, reviews: 4.87 }),
    ).toBe("4.9");
  });

  it("falls back to the configured value when stats are unavailable", () => {
    const items = getOrderedStatItems(DEFAULT_CONFIG.landingStats);

    expect(items.map((item) => resolveLandingStatValue(item, null))).toEqual([
      "1.2k+",
      "5k+",
      "4.9",
    ]);
    expect(items.map((item) => resolveLandingStatValue(item, {}))).toEqual([
      "1.2k+",
      "5k+",
      "4.9",
    ]);
    expect(
      items.map((item) =>
        resolveLandingStatValue(item, { providers: null, bookings: null, reviews: null }),
      ),
    ).toEqual(["1.2k+", "5k+", "4.9"]);
  });

  it("never renders blank or NaN", () => {
    const item = {
      id: "broken",
      key: "providers",
      label: "Creators",
      format: "compact" as const,
      orderIndex: 0,
      enabled: true,
      fallbackValue: "",
    };

    expect(resolveLandingStatValue(item, null)).toBe("—");
    expect(resolveLandingStatValue(item, { providers: Number.NaN })).toBe("—");
  });
});

describe("countdown icons", () => {
  it("resolves every allowlisted name to a lucide component", () => {
    for (const name of COUNTDOWN_ICON_NAMES) {
      expect(resolveCountdownIcon(name)).toBeTruthy();
    }
  });

  it("falls back to the default icon for unknown names", () => {
    expect(resolveCountdownIcon("NotAnIcon")).toBe(resolveCountdownIcon(DEFAULT_COUNTDOWN_ICON));
    expect(resolveCountdownIcon(undefined)).toBe(resolveCountdownIcon("Clock"));
    expect(resolveCountdownIcon(null)).toBe(resolveCountdownIcon("Clock"));
  });

  it("filters unknown allowlist names and never returns an empty list", () => {
    expect(resolveCountdownIconNames(["Clock", "Bogus"])).toEqual(["Clock"]);
    expect(resolveCountdownIconNames(["Bogus"])).toEqual([DEFAULT_COUNTDOWN_ICON]);
    expect(resolveCountdownIconNames([])).toEqual([...COUNTDOWN_ICON_NAMES]);
    expect(resolveCountdownIconNames(undefined)).toEqual([...COUNTDOWN_ICON_NAMES]);
  });

  it("mirrors the platform config allowlist", () => {
    const allowlist = DEFAULT_CONFIG.countdown!.iconAllowlist;

    expect(resolveCountdownIconNames(allowlist)).toEqual(allowlist);
  });
});
