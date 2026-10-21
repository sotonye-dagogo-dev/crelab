import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "@/config/platform.config";
import {
  fillPaymentStatusTokens,
  resolveConfiguredAvailability,
  resolvePaymentStatusCopy,
} from "@/lib/payments/status";
import type { IPlatformConfig, IPaymentStatusConfig } from "@/types";

function withStatus(
  overrides: Partial<IPaymentStatusConfig>,
  base: Partial<IPlatformConfig> = {},
): IPlatformConfig {
  return {
    ...DEFAULT_CONFIG,
    ...base,
    payments: {
      ...DEFAULT_CONFIG.payments,
      ...(base.payments ?? {}),
      status: {
        ...(DEFAULT_CONFIG.payments?.status as IPaymentStatusConfig),
        ...overrides,
      },
    },
  } as IPlatformConfig;
}

describe("resolvePaymentStatusCopy", () => {
  it("returns enabled defaults with platform tokens filled", () => {
    const copy = resolvePaymentStatusCopy(DEFAULT_CONFIG, "userTestMode", {
      name: "Acme Studio",
    });
    expect(copy.enabled).toBe(true);
    expect(copy.title).not.toContain("{{");
    expect(copy.body).not.toContain("{{");
    expect(copy.body).toContain("Acme Studio");
  });

  it("honours admin overrides and toggle switches", () => {
    const cfg = withStatus({
      userTestModeNoticeEnabled: false,
      userTestModeTitle: "Sandbox checkout",
      userTestModeBody: "{{name}} is in sandbox mode.",
    });
    const copy = resolvePaymentStatusCopy(cfg, "userTestMode", { name: "Crelab" });
    expect(copy.enabled).toBe(false);
    expect(copy.title).toBe("Sandbox checkout");
    expect(copy.body).toBe("Crelab is in sandbox mode.");
  });

  it("inherits shipped copy for blank or missing values", () => {
    const copy = resolvePaymentStatusCopy(
      withStatus({ unavailableTitle: "   " }),
      "unavailable",
    );
    expect(copy.title).toBe(
      (DEFAULT_CONFIG.payments?.status as IPaymentStatusConfig).unavailableTitle,
    );
  });

  it("fills provider/fallback tokens for admin copy", () => {
    const copy = resolvePaymentStatusCopy(DEFAULT_CONFIG, "adminFallback", {
      name: "Crelab",
      provider: "Paystack",
      fallback: "Monnify",
    });
    expect(copy.body).toContain("Paystack");
    expect(copy.body).toContain("Monnify");
  });
});

describe("fillPaymentStatusTokens", () => {
  it("leaves unknown tokens untouched instead of crashing", () => {
    expect(fillPaymentStatusTokens("Hi {{name}} — {{unknown}}", { name: "X" })).toBe(
      "Hi X — {{unknown}}",
    );
  });
});

describe("resolveConfiguredAvailability", () => {
  it("defaults to Paystack enabled", () => {
    expect(resolveConfiguredAvailability(undefined)).toMatchObject({
      active: "PAYSTACK",
      activeEnabled: true,
      anyEnabled: true,
      allDisabled: false,
    });
  });

  it("reports all-disabled when both toggles are off", () => {
    const availability = resolveConfiguredAvailability({
      active: "PAYSTACK",
      fallback: "MONNIFY",
      providers: {
        paystack: { enabled: false, testMode: false },
        monnify: { enabled: false, testMode: true },
      },
    });
    expect(availability.allDisabled).toBe(true);
    expect(availability.anyEnabled).toBe(false);
  });

  it("keeps fallback availability independent of the active toggle", () => {
    const availability = resolveConfiguredAvailability({
      active: "PAYSTACK",
      fallback: "MONNIFY",
      providers: {
        paystack: { enabled: false, testMode: false },
        monnify: { enabled: true, testMode: true },
      },
    });
    expect(availability.allDisabled).toBe(false);
    expect(availability.fallbackEnabled).toBe(true);
  });
});
