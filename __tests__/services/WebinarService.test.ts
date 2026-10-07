import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    select: vi.fn(),
    transaction: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  db: { select: mockDb.select, transaction: mockDb.transaction },
}));

import {
  DEFAULT_DURATION_FALLBACK_MINUTES,
  DEFAULT_PUBLIC_PAGE_SIZE,
  MAX_PUBLIC_PAGE_SIZE,
  WebinarError,
  deriveWebinarPhase,
  effectiveEnd,
  normalizePagination,
  registrationEmailKey,
} from "@/services/WebinarService";
import {
  formatWebinarStart,
  normalizeSeatLimit,
  resolveWebinarsConfig,
} from "@/lib/webinars";
import { DEFAULT_CONFIG } from "@/config/platform.config";

beforeEach(() => {
  mockDb.select.mockReset();
  mockDb.transaction.mockReset();
});

describe("WebinarService — registrationEmailKey", () => {
  it("lowercases and trims so uniqueness matches the schema's email_key", () => {
    expect(registrationEmailKey("  Ada@Example.COM ")).toBe("ada@example.com");
  });

  it("is stable for already-normalised input", () => {
    expect(registrationEmailKey("ada@example.com")).toBe("ada@example.com");
  });
});

describe("WebinarService — effectiveEnd", () => {
  const base = Date.parse("2026-10-10T16:00:00.000Z");

  it("prefers an explicit end over start + duration", () => {
    const end = effectiveEnd(new Date(base), new Date(base + 60 * 60_000), 30);
    expect(end?.getTime()).toBe(base + 60 * 60_000);
  });

  it("falls back to start + duration when no end is set", () => {
    const end = effectiveEnd(new Date(base), null, 45);
    expect(end?.getTime()).toBe(base + 45 * 60_000);
  });

  it("uses the default duration when duration is missing or invalid", () => {
    expect(
      effectiveEnd(new Date(base), null, null)?.getTime(),
    ).toBe(base + DEFAULT_DURATION_FALLBACK_MINUTES * 60_000);
    expect(effectiveEnd(new Date(base), null, -10)?.getTime()).toBe(
      base + DEFAULT_DURATION_FALLBACK_MINUTES * 60_000,
    );
  });

  it("returns null when there is not enough information", () => {
    expect(effectiveEnd(null, null, 60)).toBeNull();
    expect(effectiveEnd("not-a-date", null, 60)).toBeNull();
  });
});

describe("WebinarService — deriveWebinarPhase", () => {
  const now = new Date("2026-10-10T12:00:00.000Z");

  it("keeps a future session upcoming", () => {
    expect(
      deriveWebinarPhase(
        { status: "UPCOMING", startsAt: "2026-10-11T15:00:00.000Z", endsAt: null, durationMinutes: 60 },
        now,
      ),
    ).toBe("upcoming");
  });

  it("keeps a running session upcoming until its effective end passes", () => {
    const running = {
      status: "UPCOMING",
      startsAt: "2026-10-10T11:30:00.000Z",
      endsAt: null,
      durationMinutes: 60,
    };
    expect(deriveWebinarPhase(running, now)).toBe("upcoming");
    // One minute past start + duration
    expect(deriveWebinarPhase(running, new Date("2026-10-10T12:31:00.000Z"))).toBe("past");
  });

  it("treats the exact effective end as past (inclusive boundary)", () => {
    expect(
      deriveWebinarPhase(
        { status: "LIVE", startsAt: "2026-10-10T11:00:00.000Z", endsAt: null, durationMinutes: 60 },
        now,
      ),
    ).toBe("past");
  });

  it("honours an explicit end over the duration", () => {
    expect(
      deriveWebinarPhase(
        {
          status: "UPCOMING",
          startsAt: "2026-10-10T11:00:00.000Z",
          endsAt: "2026-10-10T13:00:00.000Z",
          durationMinutes: 15,
        },
        now,
      ),
    ).toBe("upcoming");
  });

  it("declares ENDED and CANCELLED past regardless of dates", () => {
    const future = { startsAt: "2026-12-01T15:00:00.000Z", endsAt: null, durationMinutes: 60 };
    expect(deriveWebinarPhase({ status: "ENDED", ...future }, now)).toBe("past");
    expect(deriveWebinarPhase({ status: "CANCELLED", ...future }, now)).toBe("past");
    expect(deriveWebinarPhase({ status: "LIVE", ...future }, now)).toBe("upcoming");
  });

  it("keeps an undated session upcoming until an admin marks it", () => {
    expect(
      deriveWebinarPhase({ status: "UPCOMING", startsAt: null, endsAt: null, durationMinutes: null }, now),
    ).toBe("upcoming");
    expect(
      deriveWebinarPhase({ status: "ENDED", startsAt: null, endsAt: null, durationMinutes: null }, now),
    ).toBe("past");
  });
});

describe("WebinarService — normalizePagination (§21)", () => {
  it("applies the default page size for bad input", () => {
    const result = normalizePagination(null, "abc", {
      defaultSize: DEFAULT_PUBLIC_PAGE_SIZE,
      maxSize: MAX_PUBLIC_PAGE_SIZE,
    });
    expect(result).toEqual({ page: 1, pageSize: DEFAULT_PUBLIC_PAGE_SIZE, offset: 0 });
  });

  it("clamps oversized page sizes and negative pages", () => {
    const result = normalizePagination(-4, 9999, {
      defaultSize: DEFAULT_PUBLIC_PAGE_SIZE,
      maxSize: MAX_PUBLIC_PAGE_SIZE,
    });
    expect(result.pageSize).toBe(MAX_PUBLIC_PAGE_SIZE);
    expect(result.page).toBe(1);
    expect(result.offset).toBe(0);
  });

  it("computes the offset from page × size", () => {
    const result = normalizePagination(3, 10, {
      defaultSize: DEFAULT_PUBLIC_PAGE_SIZE,
      maxSize: MAX_PUBLIC_PAGE_SIZE,
    });
    expect(result).toEqual({ page: 3, pageSize: 10, offset: 20 });
  });
});

describe("WebinarService — WebinarError", () => {
  it("carries a machine-readable code for HTTP mapping", () => {
    const err = new WebinarError("This webinar has reached its registration limit", "full");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("WebinarError");
    expect(err.code).toBe("full");
  });
});

describe("lib/webinars — resolveWebinarsConfig", () => {
  it("returns the hardcoded defaults when nothing is saved", () => {
    const resolved = resolveWebinarsConfig(null);
    expect(resolved.heroTitle).toBe(DEFAULT_CONFIG.webinars?.heroTitle);
    expect(resolved.registerCtaLabel).toBe(DEFAULT_CONFIG.webinars?.registerCtaLabel);
  });

  it("lets saved values win over the defaults", () => {
    const resolved = resolveWebinarsConfig({ heroTitle: "Live sessions" });
    expect(resolved.heroTitle).toBe("Live sessions");
    expect(resolved.pastTitle).toBe(DEFAULT_CONFIG.webinars?.pastTitle);
  });

  it("keeps 0 as the unlimited-seats sentinel but rejects negatives and garbage", () => {
    expect(normalizeSeatLimit(0)).toBe(0);
    expect(normalizeSeatLimit(-5)).toBe(DEFAULT_CONFIG.webinars?.maxRegistrantsPerWebinar);
    expect(normalizeSeatLimit(Number.NaN)).toBe(
      DEFAULT_CONFIG.webinars?.maxRegistrantsPerWebinar,
    );
    expect(normalizeSeatLimit(12.7)).toBe(12);
  });
});

describe("lib/webinars — formatWebinarStart", () => {
  it("returns null for missing or unparseable dates", () => {
    expect(formatWebinarStart(null)).toBeNull();
    expect(formatWebinarStart(undefined)).toBeNull();
    expect(formatWebinarStart("not-a-date")).toBeNull();
  });

  it("formats a real session date", () => {
    const label = formatWebinarStart("2026-10-10T16:00:00.000Z", {
      timeZone: "UTC",
      timeZoneLabel: "UTC",
    });
    expect(label).toContain("2026");
    expect(label).toContain("(UTC)");
  });
});
