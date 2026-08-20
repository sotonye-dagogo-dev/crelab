import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { initTransaction, verifyTransaction } from "@/lib/paystack";

function mockFetchJson(body: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    text: async () => JSON.stringify(body),
    json: async () => body,
  });
}

describe("lib/paystack — initTransaction", () => {
  beforeEach(() => {
    process.env.PAYSTACK_SECRET_KEY = "sk_test_dummy";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.PAYSTACK_SECRET_KEY;
  });

  it("sends amount, email, and reference to Paystack", async () => {
    const fetchMock = mockFetchJson({
      status: true,
      message: "Success",
      data: {
        authorization_url: "https://checkout.paystack.com/abc",
        access_code: "abc123",
        reference: "WALLET-TOPUP-u1-1",
      },
    });
    vi.stubGlobal("fetch", fetchMock);

    await initTransaction(2500000, "a@b.com", "WALLET-TOPUP-u1-1");

    const [, init] = fetchMock.mock.calls[0];
    const payload = JSON.parse(init.body);
    expect(payload.amount).toBe(2500000);
    expect(payload.email).toBe("a@b.com");
    expect(payload.reference).toBe("WALLET-TOPUP-u1-1");
    expect(payload.metadata).toBeUndefined();
    expect(payload.callback_url).toBeUndefined();
  });

  it("attaches metadata and callback_url when provided", async () => {
    const fetchMock = mockFetchJson({
      status: true,
      message: "Success",
      data: {
        authorization_url: "https://checkout.paystack.com/abc",
        access_code: "abc123",
        reference: "WALLET-TOPUP-u1-2",
      },
    });
    vi.stubGlobal("fetch", fetchMock);

    await initTransaction(100000, "a@b.com", "WALLET-TOPUP-u1-2", {
      metadata: { purpose: "WALLET_TOPUP", userId: "u1" },
      callbackUrl: "https://crellab.com/wallet/payment-status",
    });

    const [, init] = fetchMock.mock.calls[0];
    const payload = JSON.parse(init.body);
    expect(payload.metadata).toEqual({ purpose: "WALLET_TOPUP", userId: "u1" });
    expect(payload.callback_url).toBe("https://crellab.com/wallet/payment-status");
  });

  it("throws when Paystack reports a failure status", async () => {
    const fetchMock = mockFetchJson({ status: false, message: "Invalid key" });
    vi.stubGlobal("fetch", fetchMock);

    await expect(initTransaction(100000, "a@b.com", "r1")).rejects.toThrow(
      "Paystack init error",
    );
  });
});

describe("lib/paystack — verifyTransaction", () => {
  beforeEach(() => {
    process.env.PAYSTACK_SECRET_KEY = "sk_test_dummy";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.PAYSTACK_SECRET_KEY;
  });

  it("maps a successful charge to status=success with amount and metadata", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchJson({
        status: true,
        data: {
          status: "success",
          reference: "WALLET-TOPUP-u1-3",
          amount: 1500000,
          customer: { email: "a@b.com" },
          metadata: { purpose: "WALLET_TOPUP", userId: "u1" },
        },
      }),
    );

    const result = await verifyTransaction("WALLET-TOPUP-u1-3");
    expect(result.status).toBe("success");
    expect(result.amountKobo).toBe(1500000);
    expect(result.customerEmail).toBe("a@b.com");
    expect(result.metadata).toEqual({ purpose: "WALLET_TOPUP", userId: "u1" });
  });

  it("maps non-success statuses faithfully", async () => {
    for (const [raw, expected] of [
      ["failed", "failed"],
      ["abandoned", "abandoned"],
      ["pending", "pending"],
      ["processing", "pending"],
    ] as const) {
      vi.stubGlobal(
        "fetch",
        mockFetchJson({
          status: true,
          data: { status: raw, reference: "r", amount: 1000, metadata: null },
        }),
      );
      const result = await verifyTransaction("r");
      expect(result.status).toBe(expected);
    }
  });

  it("throws on a non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchJson({ status: false, message: "Transaction reference not found" }, false, 404),
    );
    await expect(verifyTransaction("missing")).rejects.toThrow("Paystack verify failed");
  });
});