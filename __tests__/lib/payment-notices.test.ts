import { describe, it, expect } from "vitest";
import {
  PAYMENT_NOTICE_KEYS,
  resolvePaymentNotice,
  resolvePaymentNotices,
} from "@/lib/payment-notices";
import {
  fillConfigCopy,
  formatEscrowWindow,
  formatFeeRatePercent,
} from "@/lib/platform-copy";
import { DEFAULT_CONFIG } from "@/config/platform.config";

const baseConfig = {
  name: "Crellab",
  feeRate: 0.05,
  escrowReleaseDays: 1,
  payments: DEFAULT_CONFIG.payments,
};

describe("lib/payment-notices — resolvePaymentNotice", () => {
  it("returns the enabled default with live-config tokens filled", () => {
    const notice = resolvePaymentNotice(baseConfig, "payoutDetails");
    expect(notice).not.toBeNull();
    expect(notice!.key).toBe("payoutDetails");
    expect(notice!.title.length).toBeGreaterThan(0);
    expect(notice!.body).toContain("Crellab");
    expect(notice!.body).not.toContain("{{name}}");
  });

  it("returns defaults when a config carries no payments block (older/partial rows)", () => {
    const notice = resolvePaymentNotice(
      { ...baseConfig, payments: undefined },
      "escrowExplainer",
    );
    expect(notice).not.toBeNull();
    expect(notice!.body).toContain("1 day"); // escrowWindow filled from escrowReleaseDays
    expect(notice!.body).not.toContain("{{escrowWindow}}");
  });

  it("renders the fee token as a percent number ({{feeRate}} → 5)", () => {
    const notice = resolvePaymentNotice(baseConfig, "processingFees");
    expect(notice!.body).toContain("5% platform service fee");
    expect(notice!.body).not.toContain("{{feeRate}}");
  });

  it("tracks admin-edited config values (not hardcoded defaults)", () => {
    const notice = resolvePaymentNotice(
      { ...baseConfig, escrowReleaseDays: 7, feeRate: 0.075 },
      "escrowExplainer",
    );
    expect(notice!.body).toContain("7 days");
    const fees = resolvePaymentNotice({ ...baseConfig, feeRate: 0.075 }, "processingFees");
    expect(fees!.body).toContain("7.5% platform service fee");
  });

  it("returns null when the notice is disabled in config", () => {
    const notice = resolvePaymentNotice(
      {
        ...baseConfig,
        payments: {
          notices: {
            ...DEFAULT_CONFIG.payments!.notices,
            payoutDetails: { enabled: false, title: "t", body: "b" },
          },
        },
      },
      "payoutDetails",
    );
    expect(notice).toBeNull();
  });

  it("merges a partial saved notice over the default (saved body wins, saved enabled honoured)", () => {
    const notice = resolvePaymentNotice(
      {
        ...baseConfig,
        payments: {
          notices: {
            ...DEFAULT_CONFIG.payments!.notices,
            payoutDetails: {
              enabled: true,
              title: "Custom payout title",
              body: "Bespoke body with {{name}} token.",
            },
          },
        },
      },
      "payoutDetails",
    );
    expect(notice!.title).toBe("Custom payout title");
    expect(notice!.body).toBe("Bespoke body with Crellab token.");
  });

  it("returns null for a notice that is enabled but entirely empty", () => {
    const notice = resolvePaymentNotice(
      {
        ...baseConfig,
        payments: {
          notices: {
            ...DEFAULT_CONFIG.payments!.notices,
            processingFees: { enabled: true, title: "   ", body: "" },
          },
        },
      },
      "processingFees",
    );
    expect(notice).toBeNull();
  });
});

describe("lib/payment-notices — resolvePaymentNotices", () => {
  it("returns every enabled notice in stable key order", () => {
    const notices = resolvePaymentNotices(baseConfig);
    expect(notices.map((n) => n.key)).toEqual([...PAYMENT_NOTICE_KEYS]);
  });

  it("skips disabled notices but keeps the rest", () => {
    const notices = resolvePaymentNotices({
      ...baseConfig,
      payments: {
        notices: {
          ...DEFAULT_CONFIG.payments!.notices,
          processingFees: { enabled: false, title: "t", body: "b" },
        },
      },
    });
    expect(notices.map((n) => n.key)).toEqual(["payoutDetails", "escrowExplainer"]);
  });
});

describe("lib/platform-copy — payment copy token helpers", () => {
  it("formatEscrowWindow pluralises and clamps", () => {
    expect(formatEscrowWindow(1)).toBe("1 day");
    expect(formatEscrowWindow(5)).toBe("5 days");
    expect(formatEscrowWindow(0)).toBe("1 day");
    expect(formatEscrowWindow(-3)).toBe("1 day");
    expect(formatEscrowWindow(2.9)).toBe("2 days");
    expect(formatEscrowWindow(Number.NaN)).toBe("1 day");
  });

  it("formatFeeRatePercent renders whole and fractional percents", () => {
    expect(formatFeeRatePercent(0.05)).toBe("5");
    expect(formatFeeRatePercent(0.075)).toBe("7.5");
    expect(formatFeeRatePercent(0)).toBe("0");
    expect(formatFeeRatePercent(Number.NaN)).toBe("");
  });

  it("fillConfigCopy fills only the tokens whose vars were provided", () => {
    const text = "{{name}} fee {{feeRate}} window {{escrowWindow}}";
    expect(fillConfigCopy(text, { name: "X" })).toBe("X fee {{feeRate}} window {{escrowWindow}}");
    expect(fillConfigCopy(text, { name: "X", feeRate: 0.05, escrowReleaseDays: 1 })).toBe(
      "X fee 5 window 1 day",
    );
  });
});
