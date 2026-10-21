import crypto from "crypto";
import {
  PaymentProviderError,
  type PaymentInitInput,
  type PaymentInitResult,
  type PaymentPayoutInput,
  type PaymentPayoutResult,
  type PaymentProviderAdapter,
  type PaymentRefundInput,
  type PaymentVerification,
  type PaymentWebhookInput,
  type VerifiedPaymentStatus,
} from "@/lib/payments/types";

/**
 * Monnify adapter.
 *
 * Protocol notes that matter for correctness (verified against Monnify docs,
 * 2026-10):
 *  - OAuth login: Basic base64(apiKey:secretKey) → POST /api/v1/auth/login.
 *    Tokens live for 1 hour; we cache them per environment/key.
 *  - MONNIFY AMOUNTS ARE NAIRA DECIMALS, not kobo. Every boundary converts
 *    explicitly (`nairaToKobo` / `koboToNaira`) — never mix units.
 *  - Checkout returns `checkoutUrl` + `transactionReference`; the customer is
 *    redirected. There is no inline popup, so Paystack's `accessCode` is null.
 *  - Verify by our `paymentReference`:
 *    GET /api/v2/transactions/{paymentReference}.
 *  - The hosted checkout URL expires after 40 minutes and references must be
 *    unique per attempt (we regenerate per checkout, like Paystack).
 *  - Webhooks use SHA-512(clientSecret + rawBody) in `monnify-signature`.
 *    Sandbox webhooks do not include the header — accepted only when the
 *    runtime is explicitly in test mode.
 *  - Refunds require the provider `transactionReference`, must be activated by
 *    Monnify, are minimum ₦100, and virtual-account payments cannot be refunded
 *    to the originating (temporary) account.
 *  - Disbursements require a funded `sourceAccountNumber` on the merchant
 *    wallet; there is no recipient-code abstraction like Paystack's.
 */

const SANDBOX_BASE = "https://sandbox.monnify.com";
const LIVE_BASE = "https://api.monnify.com";
const REQUEST_TIMEOUT_MS = 15_000;

export interface MonnifyCredentials {
  testMode: boolean;
  baseUrl: string;
  apiKey: string;
  secretKey: string;
  contractCode: string;
  sourceAccountNumber: string | null;
}

interface TokenCacheEntry {
  token: string;
  expiresAt: number;
}

const tokenCache = new Map<string, TokenCacheEntry>();

/** Test seam — resets the in-process OAuth token cache. */
export function resetMonnifyTokenCache(): void {
  tokenCache.clear();
}

export function getMonnifyCredentials(testMode: boolean): MonnifyCredentials | null {
  const apiKey = testMode ? process.env.MONNIFY_TEST_API_KEY : process.env.MONNIFY_API_KEY;
  const secretKey = testMode
    ? process.env.MONNIFY_TEST_SECRET_KEY
    : process.env.MONNIFY_SECRET_KEY;
  const contractCode = testMode
    ? process.env.MONNIFY_TEST_CONTRACT_CODE
    : process.env.MONNIFY_CONTRACT_CODE;
  if (!apiKey || !secretKey || !contractCode) return null;

  return {
    testMode,
    baseUrl: testMode ? SANDBOX_BASE : LIVE_BASE,
    apiKey,
    secretKey,
    contractCode,
    sourceAccountNumber: testMode
      ? (process.env.MONNIFY_TEST_SOURCE_ACCOUNT_NUMBER ?? null)
      : (process.env.MONNIFY_SOURCE_ACCOUNT_NUMBER ?? null),
  };
}

export function isMonnifyConfigured(testMode: boolean): boolean {
  return getMonnifyCredentials(testMode) !== null;
}

/** Monnify amounts arrive as NGN decimals; the platform stores kobo integers. */
export function nairaToKobo(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

/** Kobo integer → Monnify's NGN decimal (2dp, never floating-point money). */
export function koboToNaira(kobo: number): number {
  return Math.round(kobo) / 100;
}

export function verifyMonnifySignature(
  rawBody: string,
  signature: string,
  secretKey: string,
): boolean {
  if (!signature) return false;
  const expected = crypto
    .createHash("sha512")
    .update(secretKey + rawBody)
    .digest("hex");
  if (signature.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected.toLowerCase()),
      Buffer.from(signature.toLowerCase()),
    );
  } catch {
    return false;
  }
}

function mapStatus(raw: string | undefined): VerifiedPaymentStatus {
  switch ((raw ?? "").toUpperCase()) {
    case "PAID":
    case "OVERPAID":
      return "success";
    case "PENDING":
      // PARTIALLY_PAID is deliberately treated as still-pending: money has
      // moved, so it is never safe to start a second checkout automatically.
    case "PARTIALLY_PAID":
      return "pending";
    case "FAILED":
    case "REVERSED":
    case "EXPIRED":
    case "CANCELLED":
    case "ABANDONED":
      return "failed";
    default:
      return "pending";
  }
}

async function getAccessToken(creds: MonnifyCredentials): Promise<string> {
  const key = `${creds.baseUrl}|${creds.apiKey}`;
  const cached = tokenCache.get(key);
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.token;

  const basic = Buffer.from(`${creds.apiKey}:${creds.secretKey}`).toString("base64");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${creds.baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { Authorization: `Basic ${basic}` },
      signal: controller.signal,
    });
    const json = (await res.json().catch(() => null)) as
      | { requestSuccessful?: boolean; responseMessage?: string; responseBody?: { accessToken?: string; expiresIn?: number } }
      | null;
    const token = json?.responseBody?.accessToken;
    if (!res.ok || !json?.requestSuccessful || !token) {
      throw new PaymentProviderError(
        "MONNIFY",
        `Monnify authentication failed: ${json?.responseMessage ?? res.status}`,
        res.status >= 500,
      );
    }
    const ttlMs = Math.max(60, Number(json.responseBody?.expiresIn ?? 3300)) * 1000;
    tokenCache.set(key, { token, expiresAt: Date.now() + ttlMs });
    return token;
  } catch (err) {
    if (err instanceof PaymentProviderError) throw err;
    throw new PaymentProviderError(
      "MONNIFY",
      `Monnify authentication unreachable: ${err instanceof Error ? err.message : "network error"}`,
      true,
    );
  } finally {
    clearTimeout(timer);
  }
}

interface MonnifyEnvelope<T> {
  requestSuccessful: boolean;
  responseMessage?: string;
  responseCode?: string;
  responseBody?: T;
}

async function monnifyRequest<T>(
  creds: MonnifyCredentials,
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const token = await getAccessToken(creds);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${creds.baseUrl}${path}`, {
      method: init.method ?? "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: controller.signal,
    });
    const json = (await res.json().catch(() => null)) as MonnifyEnvelope<T> | null;
    if (!res.ok || !json?.requestSuccessful) {
      throw new PaymentProviderError(
        "MONNIFY",
        `Monnify request failed (${path}): ${json?.responseMessage ?? res.status}`,
        res.status >= 500 || res.status === 429,
      );
    }
    return (json.responseBody ?? ({} as T)) as T;
  } catch (err) {
    if (err instanceof PaymentProviderError) throw err;
    throw new PaymentProviderError(
      "MONNIFY",
      `Monnify unreachable (${path}): ${err instanceof Error ? err.message : "network error"}`,
      true,
    );
  } finally {
    clearTimeout(timer);
  }
}

interface MonnifyInitResponse {
  checkoutUrl?: string;
  transactionReference?: string;
  paymentReference?: string;
}

export async function monnifyInitTransaction(
  input: PaymentInitInput,
  testMode: boolean,
): Promise<PaymentInitResult> {
  const creds = getMonnifyCredentials(testMode);
  if (!creds) {
    throw new PaymentProviderError(
      "MONNIFY",
      `Monnify ${testMode ? "sandbox" : "live"} credentials are not configured`,
    );
  }

  const body = {
    amount: koboToNaira(input.amountKobo),
    customerEmail: input.email,
    customerName: input.customerName ?? input.email,
    paymentReference: input.reference,
    paymentDescription:
      typeof input.metadata?.description === "string"
        ? input.metadata.description
        : "Payment",
    currencyCode: "NGN",
    contractCode: creds.contractCode,
    redirectUrl: input.callbackUrl,
    paymentMethods: input.paymentMethods,
    // Monnify's schema types metadata values as strings; booleans (e.g.
    // testMode) would otherwise be rejected or coerced inconsistently.
    metaData: Object.fromEntries(
      Object.entries(input.metadata ?? {}).map(([key, value]) => [key, String(value)]),
    ),
  };

  const data = await monnifyRequest<MonnifyInitResponse>(
    creds,
    "/api/v1/merchant/transactions/init-transaction",
    { method: "POST", body },
  );

  if (!data.checkoutUrl) {
    throw new PaymentProviderError("MONNIFY", "Monnify did not return a checkout URL");
  }

  return {
    authorizationUrl: data.checkoutUrl,
    accessCode: null,
    reference: data.paymentReference ?? input.reference,
    providerReference: data.transactionReference ?? null,
    checkoutMode: "REDIRECT",
    provider: "MONNIFY",
    testMode,
  };
}

interface MonnifyTransactionResponse {
  transactionReference?: string;
  paymentReference?: string;
  amountPaid?: number | string;
  totalPayable?: number | string;
  paymentStatus?: string;
  customer?: { email?: string } | null;
  metaData?: Record<string, unknown> | null;
}

export async function monnifyVerifyTransaction(
  reference: string,
  testMode: boolean,
): Promise<PaymentVerification> {
  const creds = getMonnifyCredentials(testMode);
  if (!creds) {
    throw new PaymentProviderError(
      "MONNIFY",
      `Monnify ${testMode ? "sandbox" : "live"} credentials are not configured`,
    );
  }

  const data = await monnifyRequest<MonnifyTransactionResponse>(
    creds,
    `/api/v2/transactions/${encodeURIComponent(reference)}`,
  );

  return {
    status: mapStatus(data.paymentStatus),
    reference: data.paymentReference ?? reference,
    amountKobo: nairaToKobo(data.amountPaid),
    customerEmail: data.customer?.email ?? null,
    metadata: data.metaData ?? {},
    providerReference: data.transactionReference ?? null,
    provider: "MONNIFY",
    testMode,
  };
}

export async function monnifyRefund(
  input: PaymentRefundInput,
  testMode: boolean,
): Promise<void> {
  const creds = getMonnifyCredentials(testMode);
  if (!creds) {
    throw new PaymentProviderError("MONNIFY", "Monnify credentials are not configured");
  }
  const transactionReference = input.providerReference;
  if (!transactionReference) {
    throw new PaymentProviderError(
      "MONNIFY",
      "Monnify refunds require the provider transaction reference",
    );
  }

  const amountKobo = input.amountKobo;
  if (amountKobo !== undefined && amountKobo > 0 && amountKobo < 10_000) {
    throw new PaymentProviderError(
      "MONNIFY",
      "Monnify refunds have a minimum of ₦100",
    );
  }

  const reason = (input.reason ?? "Booking refund").slice(0, 64);
  await monnifyRequest(creds, "/api/v1/refunds/initiate-refund", {
    method: "POST",
    body: {
      transactionReference,
      refundReference: `REF-${input.reference}`.slice(0, 64),
      ...(amountKobo && amountKobo > 0 ? { refundAmount: koboToNaira(amountKobo) } : {}),
      refundReason: reason,
      customerNote: "Refund".slice(0, 16),
    },
  });
}

export async function monnifyPayout(
  input: PaymentPayoutInput,
  testMode: boolean,
): Promise<PaymentPayoutResult> {
  const creds = getMonnifyCredentials(testMode);
  if (!creds) {
    throw new PaymentProviderError("MONNIFY", "Monnify credentials are not configured");
  }
  if (input.destination.kind !== "bank_account") {
    throw new PaymentProviderError(
      "MONNIFY",
      "Monnify payouts require bank account details (it has no recipient-code abstraction)",
    );
  }
  if (!creds.sourceAccountNumber) {
    throw new PaymentProviderError(
      "MONNIFY",
      "Monnify payouts require MONNIFY_SOURCE_ACCOUNT_NUMBER (funded merchant wallet)",
    );
  }

  const account = input.destination.account;
  const data = await monnifyRequest<{ reference?: string; status?: string }>(
    creds,
    "/api/v2/disbursements/single",
    {
      method: "POST",
      body: {
        amount: koboToNaira(input.amountKobo),
        reference: input.reference,
        narration: account.narration ?? "Payout",
        destinationBankCode: account.bankCode,
        destinationAccountNumber: account.accountNumber,
        destinationAccountName: account.accountName,
        currency: "NGN",
        sourceAccountNumber: creds.sourceAccountNumber,
      },
    },
  );

  return {
    transferCode: data.reference ?? input.reference,
    providerReference: data.reference ?? null,
    provider: "MONNIFY",
    testMode,
  };
}

function webhookSecrets(): string[] {
  return [
    process.env.MONNIFY_SECRET_KEY,
    process.env.MONNIFY_TEST_SECRET_KEY,
  ].filter((s): s is string => typeof s === "string" && s.length > 0);
}

export const monnifyAdapter: PaymentProviderAdapter = {
  id: "MONNIFY",
  label: "Monnify",
  supportsPopup: false,
  supportsTestMode: true,
  isConfigured: isMonnifyConfigured,
  initTransaction: monnifyInitTransaction,
  verifyTransaction: monnifyVerifyTransaction,
  verifyWebhookSignature(input: PaymentWebhookInput) {
    if (!input.signature) return false;
    // The secret used depends on which environment issued the transaction;
    // accept a match against either configured secret (read-only check).
    return webhookSecrets().some((secret) =>
      verifyMonnifySignature(input.rawBody, input.signature as string, secret),
    );
  },
  refund: monnifyRefund,
  payout: monnifyPayout,
};
