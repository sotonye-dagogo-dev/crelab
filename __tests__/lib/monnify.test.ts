import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import {
  isMonnifyConfigured,
  koboToNaira,
  monnifyInitTransaction,
  monnifyPayout,
  monnifyRefund,
  monnifyVerifyTransaction,
  nairaToKobo,
  resetMonnifyTokenCache,
  verifyMonnifySignature,
} from "@/lib/payments/monnify";

function mockFetchJson(body: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  });
}

const authResponse = {
  requestSuccessful: true,
  responseMessage: "success",
  responseBody: { accessToken: "token_123", expiresIn: 3300 },
};

function setCreds() {
  process.env.MONNIFY_TEST_API_KEY = "mk_test";
  process.env.MONNIFY_TEST_SECRET_KEY = "ms_test";
  process.env.MONNIFY_TEST_CONTRACT_CODE = "contract_test";
  process.env.MONNIFY_TEST_SOURCE_ACCOUNT_NUMBER = "1234567890";
}

function clearCreds() {
  delete process.env.MONNIFY_TEST_API_KEY;
  delete process.env.MONNIFY_TEST_SECRET_KEY;
  delete process.env.MONNIFY_TEST_CONTRACT_CODE;
  delete process.env.MONNIFY_TEST_SOURCE_ACCOUNT_NUMBER;
  delete process.env.MONNIFY_API_KEY;
  delete process.env.MONNIFY_SECRET_KEY;
  delete process.env.MONNIFY_CONTRACT_CODE;
  delete process.env.MONNIFY_SOURCE_ACCOUNT_NUMBER;
}

describe("lib/payments/monnify — units + signature", () => {
  it("converts NGN decimals to kobo without float drift", () => {
    expect(nairaToKobo(2500)).toBe(250000);
    expect(nairaToKobo("2500.50")).toBe(250050);
    expect(nairaToKobo("bad")).toBe(0);
    expect(koboToNaira(250050)).toBe(2500.5);
  });

  it("verifies SHA-512(clientSecret + rawBody) and rejects tampering", () => {
    const secret = "ms_test";
    const body = JSON.stringify({ eventType: "SUCCESSFUL_TRANSACTION" });
    const sig = crypto.createHash("sha512").update(secret + body).digest("hex");

    expect(verifyMonnifySignature(body, sig, secret)).toBe(true);
    expect(verifyMonnifySignature(body + " ", sig, secret)).toBe(false);
    expect(verifyMonnifySignature(body, "deadbeef", secret)).toBe(false);
    expect(verifyMonnifySignature(body, "", secret)).toBe(false);
  });
});

describe("lib/payments/monnify — API translation", () => {
  beforeEach(() => {
    setCreds();
    resetMonnifyTokenCache();
  });
  afterEach(() => {
    clearCreds();
    vi.unstubAllGlobals();
    resetMonnifyTokenCache();
  });

  it("reports configured only when the requested mode has credentials", () => {
    expect(isMonnifyConfigured(true)).toBe(true);
    expect(isMonnifyConfigured(false)).toBe(false);
  });

  it("initialises checkout with a NGN amount and returns a redirect", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => authResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          requestSuccessful: true,
          responseBody: {
            checkoutUrl: "https://sandbox.monnify.com/checkout/abc",
            transactionReference: "MNFY_TX_1",
            paymentReference: "CRELLAB-b1-1",
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await monnifyInitTransaction(
      {
        amountKobo: 250050,
        email: "a@b.com",
        reference: "CRELLAB-b1-1",
        customerName: "Ada",
        metadata: { purpose: "BOOKING_PAYMENT", bookingId: "b1", testMode: true },
        callbackUrl: "https://crellab.app/bookings",
      },
      true,
    );

    expect(result.checkoutMode).toBe("REDIRECT");
    expect(result.accessCode).toBeNull();
    expect(result.providerReference).toBe("MNFY_TX_1");
    expect(result.authorizationUrl).toContain("checkout");

    const [, init] = fetchMock.mock.calls[1];
    const payload = JSON.parse(init.body);
    expect(payload.amount).toBe(2500.5);
    expect(payload.contractCode).toBe("contract_test");
    expect(payload.paymentReference).toBe("CRELLAB-b1-1");
    expect(payload.metaData.bookingId).toBe("b1");
    expect(payload.metaData.testMode).toBe("true");

    // Auth is Basic base64(apiKey:secretKey).
    const [, authInit] = fetchMock.mock.calls[0];
    expect(authInit.headers.Authorization).toBe(
      `Basic ${Buffer.from("mk_test:ms_test").toString("base64")}`,
    );
  });

  it("maps PAID/PENDING/PARTIALLY_PAID statuses safely", async () => {
    const paid = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => authResponse })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          requestSuccessful: true,
          responseBody: {
            paymentStatus: "PAID",
            amountPaid: 1200.25,
            paymentReference: "CRELLAB-b1-2",
            transactionReference: "TX_2",
            customer: { email: "a@b.com" },
            metaData: { purpose: "BOOKING_PAYMENT" },
          },
        }),
      });
    vi.stubGlobal("fetch", paid);

    const verified = await monnifyVerifyTransaction("CRELLAB-b1-2", true);
    expect(verified.status).toBe("success");
    expect(verified.amountKobo).toBe(120025);
    expect(verified.providerReference).toBe("TX_2");
    expect(verified.metadata.purpose).toBe("BOOKING_PAYMENT");

    const partial = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => authResponse })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          requestSuccessful: true,
          responseBody: { paymentStatus: "PARTIALLY_PAID", amountPaid: 100, paymentReference: "r" },
        }),
      });
    vi.stubGlobal("fetch", partial);
    await expect(monnifyVerifyTransaction("r", true)).resolves.toMatchObject({
      status: "pending",
    });
  });

  it("refuses refunds without the provider transaction reference or below ₦100", async () => {
    await expect(
      monnifyRefund({ reference: "CRELLAB-b1-3", amountKobo: 5000 }, true),
    ).rejects.toThrow(/transaction reference/i);

    await expect(
      monnifyRefund(
        { reference: "CRELLAB-b1-3", providerReference: "TX_3", amountKobo: 5000 },
        true,
      ),
    ).rejects.toThrow(/minimum/i);
  });

  it("refuses recipient-code and no-source-account payouts", async () => {
    await expect(
      monnifyPayout(
        {
          amountKobo: 10000,
          reference: "W-1",
          destination: { kind: "recipient_code", code: "RCP_x" },
        },
        true,
      ),
    ).rejects.toThrow(/bank account/i);

    delete process.env.MONNIFY_TEST_SOURCE_ACCOUNT_NUMBER;
    await expect(
      monnifyPayout(
        {
          amountKobo: 10000,
          reference: "W-2",
          destination: {
            kind: "bank_account",
            account: { accountNumber: "0123456789", bankCode: "058", accountName: "Ada" },
          },
        },
        true,
      ),
    ).rejects.toThrow(/SOURCE_ACCOUNT_NUMBER/);
  });

  it("posts disbursements with NGN amount and source account", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => authResponse })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          requestSuccessful: true,
          responseBody: { reference: "DISB_1", status: "SUCCESS" },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await monnifyPayout(
      {
        amountKobo: 500000,
        reference: "W-3",
        destination: {
          kind: "bank_account",
          account: { accountNumber: "0123456789", bankCode: "058", accountName: "Ada" },
        },
      },
      true,
    );

    expect(result.transferCode).toBe("DISB_1");
    const [, init] = fetchMock.mock.calls[1];
    const payload = JSON.parse(init.body);
    expect(payload.amount).toBe(5000);
    expect(payload.sourceAccountNumber).toBe("1234567890");
    expect(payload.destinationBankCode).toBe("058");
  });
});
