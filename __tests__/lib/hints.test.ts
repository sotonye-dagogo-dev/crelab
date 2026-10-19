import { describe, it, expect } from "vitest";
import { resolveHint, DEFAULT_HINTS, HINT_KEYS, type HintKey } from "@/lib/hints";

const baseConfig = {
  name: "Crellab",
  feeRate: 0.05,
  escrowReleaseDays: 1,
  hints: undefined,
};

describe("lib/hints — resolveHint", () => {
  it("returns the built-in default with live-config tokens filled", () => {
    const hint = resolveHint("bookingFee", baseConfig);
    expect(hint).not.toBeNull();
    expect(hint!).toContain("5%");
    expect(hint!).not.toContain("{{feeRate}}");
  });

  it("fills the escrowWindow token from escrowReleaseDays", () => {
    const hint = resolveHint("bookingEscrow", { ...baseConfig, escrowReleaseDays: 3 });
    expect(hint!).toContain("3 days");
    expect(hint!).not.toContain("{{escrowWindow}}");
  });

  it("returns defaults when the hints block is absent (older/partial config rows)", () => {
    for (const key of HINT_KEYS) {
      const hint = resolveHint(key, baseConfig);
      expect(hint, key).toBeTruthy();
      expect(hint!.length).toBeGreaterThan(10);
    }
  });

  it("returns null when the master switch is off", () => {
    const config = { ...baseConfig, hints: { enabled: false, copy: {} } };
    expect(resolveHint("bookingFee", config)).toBeNull();
  });

  it("an admin override replaces the default for that key", () => {
    const config = {
      ...baseConfig,
      hints: { enabled: true, copy: { bookingFee: "Our custom fee explainer." } },
    };
    expect(resolveHint("bookingFee", config)).toBe("Our custom fee explainer.");
    // Other keys keep their defaults.
    expect(resolveHint("walletBalance", config)).toBeTruthy();
  });

  it("an empty-string override HIDES that tip", () => {
    const config = {
      ...baseConfig,
      hints: { enabled: true, copy: { bookingFee: "" } },
    };
    expect(resolveHint("bookingFee", config)).toBeNull();
  });

  it("override copy also gets tokens filled", () => {
    const config = {
      ...baseConfig,
      hints: { enabled: true, copy: { releaseWindow: "Payouts release {{escrowWindow}} after the service date." } },
    };
    expect(resolveHint("releaseWindow", config)).toContain("1 day");
  });

  it("tracks admin-edited name/fee/escrow values (not frozen defaults)", () => {
    const config = { name: "StudioX", feeRate: 0.1, escrowReleaseDays: 7 };
    // {{feeRate}} tracks the live fee rate…
    expect(resolveHint("bookingFee", config)).toContain("10%");
    // …and {{escrowWindow}} tracks the live escrow window.
    expect(resolveHint("bookingEscrow", config)).toContain("7 days");
  });

  it("fills {{name}} in an override that uses the token (no default hint hardcodes the platform name)", () => {
    const config = {
      ...baseConfig,
      hints: { enabled: true, copy: { walletBalance: "Payouts from {{name}} land here." } },
    };
    expect(resolveHint("walletBalance", config)).toBe("Payouts from Crellab land here.");
  });
});

describe("lib/hints — DEFAULT_HINTS shape", () => {
  it("has a default for every HintKey and no extras", () => {
    const expected: HintKey[] = [
      "bookingFee",
      "bookingEscrow",
      "releaseWindow",
      "bookingDispute",
      "walletBalance",
      "walletWithdraw",
      "dashboardEscrow",
      "financeAudit",
    ];
    expect(HINT_KEYS.sort()).toEqual(expected.sort());
    for (const key of HINT_KEYS) {
      expect(DEFAULT_HINTS[key].length).toBeGreaterThan(20);
    }
  });
});
