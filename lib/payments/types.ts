import type { PaymentProviderId } from "@/types";

export type { PaymentProviderId };

/** How the customer completes checkout for a provider. */
export type CheckoutMode = "POPUP" | "REDIRECT";

export type VerifiedPaymentStatus =
  | "success"
  | "failed"
  | "abandoned"
  | "pending";

export interface PaymentRuntime {
  provider: PaymentProviderId;
  testMode: boolean;
  /**
   * Set when the configured active provider was unusable (disabled or missing
   * credentials) and the fallback provider handled the money instead. Callers
   * audit this transition once per operation.
   */
  fallbackFrom: PaymentProviderId | null;
}

export interface PaymentInitInput {
  /** Money in kobo — adapters convert to the provider's unit internally. */
  amountKobo: number;
  email: string;
  /** Our unique payment reference (never reuse across attempts). */
  reference: string;
  metadata?: Record<string, unknown>;
  callbackUrl?: string;
  customerName?: string;
  /** Optional provider method restriction (Monnify: ACCOUNT_TRANSFER, CARD…). */
  paymentMethods?: string[];
}

export interface PaymentInitResult {
  authorizationUrl: string;
  /** Paystack inline popup access code; null for redirect-only providers. */
  accessCode: string | null;
  reference: string;
  /** Provider-side transaction reference (Monnify refunds need it). */
  providerReference: string | null;
  checkoutMode: CheckoutMode;
  provider: PaymentProviderId;
  testMode: boolean;
}

export interface PaymentVerification {
  status: VerifiedPaymentStatus;
  reference: string;
  /** Money in kobo (normalised from the provider's unit). */
  amountKobo: number;
  customerEmail: string | null;
  metadata: Record<string, unknown>;
  providerReference: string | null;
  provider: PaymentProviderId;
  testMode: boolean;
}

export interface PaymentRefundInput {
  /** Our payment reference (Paystack refunds by this). */
  reference: string;
  /** Provider-side transaction reference (Monnify refunds require this). */
  providerReference?: string | null;
  /** Money in kobo (adapter converts). */
  amountKobo?: number;
  reason?: string;
}

export interface PayoutBankAccount {
  accountNumber: string;
  bankCode: string;
  accountName: string;
  narration?: string;
}

export type PayoutDestination =
  | { kind: "recipient_code"; code: string }
  | { kind: "bank_account"; account: PayoutBankAccount };

export interface PaymentPayoutInput {
  /** Money in kobo. */
  amountKobo: number;
  reference: string;
  destination: PayoutDestination;
}

export interface PaymentPayoutResult {
  transferCode: string;
  providerReference: string | null;
  provider: PaymentProviderId;
  testMode: boolean;
}

export interface PaymentWebhookInput {
  rawBody: string;
  signature: string | null;
}

/**
 * One adapter per processor. Implementations own only protocol translation —
 * all escrow/wallet state lives in the services (single source of money truth).
 */
export interface PaymentProviderAdapter {
  id: PaymentProviderId;
  label: string;
  supportsPopup: boolean;
  supportsTestMode: boolean;
  /** Credentials for the requested mode are present in the environment. */
  isConfigured(testMode: boolean): boolean;
  initTransaction(input: PaymentInitInput, testMode: boolean): Promise<PaymentInitResult>;
  verifyTransaction(reference: string, testMode: boolean): Promise<PaymentVerification>;
  /** Stateless signature check; never mutates money. */
  verifyWebhookSignature(input: PaymentWebhookInput, testMode?: boolean): boolean;
  refund(input: PaymentRefundInput, testMode: boolean): Promise<void>;
  payout(input: PaymentPayoutInput, testMode: boolean): Promise<PaymentPayoutResult>;
}

export class PaymentProviderError extends Error {
  readonly provider: PaymentProviderId;
  readonly retryable: boolean;

  constructor(provider: PaymentProviderId, message: string, retryable = false) {
    super(message);
    this.name = "PaymentProviderError";
    this.provider = provider;
    this.retryable = retryable;
  }
}

export class PaymentProviderUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentProviderUnavailableError";
  }
}
