import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  normalizePaymentProviders,
  providerSettings,
  asPaymentProviderId,
} from "@/lib/payments/config";
import {
  choosePaymentRuntime,
  getRecordedRuntime,
  isProviderUsable,
} from "@/lib/payments/runtime";
import type { IPaymentProvidersConfig } from "@/types";

function config(overrides: Partial<IPaymentProvidersConfig> = {}): IPaymentProvidersConfig {
  const base = normalizePaymentProviders(undefined);
  return {
    ...base,
    providers: {
      paystack: { enabled: true, testMode: false },
      monnify: { enabled: true, testMode: true },
    },
    ...overrides,
  };
}

beforeEach(() => {
  process.env.PAYSTACK_SECRET_KEY = "sk_live_test";
  process.env.MONNIFY_TEST_API_KEY = "mk_test";
  process.env.MONNIFY_TEST_SECRET_KEY = "ms_test";
  process.env.MONNIFY_TEST_CONTRACT_CODE = "contract_test";
});

afterEach(() => {
  for (const key of [
    "PAYSTACK_SECRET_KEY",
    "PAYSTACK_TEST_SECRET_KEY",
    "MONNIFY_TEST_API_KEY",
    "MONNIFY_TEST_SECRET_KEY",
    "MONNIFY_TEST_CONTRACT_CODE",
  ]) {
    delete process.env[key];
  }
});

describe("payment provider config", () => {
  it("defaults missing/legacy config to Paystack live", () => {
    const normalized = normalizePaymentProviders(undefined);
    expect(normalized.active).toBe("PAYSTACK");
    expect(normalized.providers.paystack.enabled).toBe(true);
    expect(normalized.providers.monnify.enabled).toBe(false);
    expect(providerSettings(normalized, "MONNIFY")).toBe(normalized.providers.monnify);
  });

  it("inherits provider defaults from a partial legacy block", () => {
    const normalized = normalizePaymentProviders({ active: "MONNIFY" });
    expect(normalized.active).toBe("MONNIFY");
    expect(normalized.providers.paystack).toEqual({ enabled: true, testMode: false });
    expect(normalized.providers.monnify).toEqual({ enabled: false, testMode: true });
  });

  it("rejects unknown provider ids", () => {
    expect(asPaymentProviderId("stripe")).toBeNull();
    expect(asPaymentProviderId("monnify")).toBe("MONNIFY");
  });
});

describe("choosePaymentRuntime", () => {
  it("uses the enabled, configured active provider", () => {
    expect(choosePaymentRuntime(config({ active: "PAYSTACK" }))).toEqual({
      provider: "PAYSTACK",
      testMode: false,
      fallbackFrom: null,
    });
  });

  it("falls back (and records why) when the active provider lacks test credentials", () => {
    const cfg = config({
      active: "PAYSTACK",
      fallback: "MONNIFY",
      providers: {
        paystack: { enabled: true, testMode: true },
        monnify: { enabled: true, testMode: true },
      },
    });
    expect(choosePaymentRuntime(cfg)).toEqual({
      provider: "MONNIFY",
      testMode: true,
      fallbackFrom: "PAYSTACK",
    });
  });

  it("throws when no provider is usable", () => {
    const cfg = config({
      providers: {
        paystack: { enabled: false, testMode: false },
        monnify: { enabled: false, testMode: true },
      },
    });
    expect(() => choosePaymentRuntime(cfg)).toThrow(/No payment provider is available/);
  });

  it("refuses a fallback that would switch sandbox to live mode", () => {
    delete process.env.PAYSTACK_SECRET_KEY;
    const cfg = config({
      active: "PAYSTACK",
      fallback: "MONNIFY",
      providers: {
        paystack: { enabled: true, testMode: false },
        monnify: { enabled: true, testMode: true },
      },
    });
    expect(() => choosePaymentRuntime(cfg)).toThrow(/sandbox and live/);
  });

  it("allows a same-environment fallback when the active provider is disabled", () => {
    const cfg = config({
      active: "PAYSTACK",
      fallback: "MONNIFY",
      providers: {
        paystack: { enabled: false, testMode: false },
        monnify: { enabled: true, testMode: true },
      },
    });
    expect(choosePaymentRuntime(cfg)).toEqual({
      provider: "MONNIFY",
      testMode: true,
      fallbackFrom: "PAYSTACK",
    });
  });

  it("reports provider usability per environment without throwing", () => {
    expect(isProviderUsable("PAYSTACK", false)).toBe(true);
    expect(isProviderUsable("PAYSTACK", true)).toBe(false);
    expect(isProviderUsable("MONNIFY", true)).toBe(true);
    expect(isProviderUsable("MONNIFY", false)).toBe(false);
  });

  it("never falls back for refunds/payouts on already-moved money", () => {
    delete process.env.MONNIFY_TEST_API_KEY;
    expect(() => getRecordedRuntime("MONNIFY", true)).toThrow(/not configured/);
    expect(getRecordedRuntime("PAYSTACK", false).runtime).toEqual({
      provider: "PAYSTACK",
      testMode: false,
      fallbackFrom: null,
    });
  });
});
