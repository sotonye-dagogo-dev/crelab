import {
  getTransferRecipient,
  initiateTransfer,
  initTransaction,
  paystackSecret,
  refund as paystackRefund,
  verifyTransaction,
  verifyWebhookSignature as verifyPaystackSignature,
} from "@/lib/paystack";
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
} from "@/lib/payments/types";

function requireSecret(testMode: boolean): string {
  const secret = paystackSecret(testMode);
  if (!secret) {
    throw new PaymentProviderError(
      "PAYSTACK",
      testMode
        ? "Paystack test mode requires PAYSTACK_TEST_SECRET_KEY"
        : "Paystack is not configured (PAYSTACK_SECRET_KEY missing)",
    );
  }
  return secret;
}

function wrap<T>(fn: () => Promise<T>): Promise<T> {
  return fn().catch((err) => {
    if (err instanceof PaymentProviderError) throw err;
    throw new PaymentProviderError(
      "PAYSTACK",
      err instanceof Error ? err.message : "Paystack request failed",
      true,
    );
  });
}

function webhookSecrets(): string[] {
  return [process.env.PAYSTACK_SECRET_KEY, process.env.PAYSTACK_TEST_SECRET_KEY].filter(
    (s): s is string => typeof s === "string" && s.length > 0,
  );
}

export const paystackAdapter: PaymentProviderAdapter = {
  id: "PAYSTACK",
  label: "Paystack",
  supportsPopup: true,
  supportsTestMode: true,

  isConfigured(testMode: boolean) {
    return Boolean(paystackSecret(testMode));
  },

  async initTransaction(input: PaymentInitInput, testMode: boolean): Promise<PaymentInitResult> {
    return wrap(async () => {
      const secret = requireSecret(testMode);
      const data = await initTransaction(
        input.amountKobo,
        input.email,
        input.reference,
        { metadata: input.metadata, callbackUrl: input.callbackUrl },
        secret,
      );
      return {
        authorizationUrl: data.authorizationUrl,
        accessCode: data.accessCode,
        reference: data.reference,
        providerReference: null,
        checkoutMode: "POPUP",
        provider: "PAYSTACK",
        testMode,
      };
    });
  },

  async verifyTransaction(reference: string, testMode: boolean): Promise<PaymentVerification> {
    return wrap(async () => {
      const data = await verifyTransaction(reference, requireSecret(testMode));
      return {
        status: data.status,
        reference: data.reference,
        amountKobo: data.amountKobo,
        customerEmail: data.customerEmail,
        metadata: data.metadata,
        providerReference: null,
        provider: "PAYSTACK",
        testMode,
      };
    });
  },

  verifyWebhookSignature(input: PaymentWebhookInput) {
    if (!input.signature) return false;
    // Whichever environment issued the charge, one of the configured secrets
    // signed it. Verification is pure and safe to attempt against both.
    return webhookSecrets().some((secret) =>
      verifyPaystackSignature(input.rawBody, input.signature as string, secret),
    );
  },

  async refund(input: PaymentRefundInput, testMode: boolean): Promise<void> {
    await wrap(() => paystackRefund(input.reference, requireSecret(testMode)));
  },

  async payout(
    input: PaymentPayoutInput,
    testMode: boolean,
  ): Promise<PaymentPayoutResult> {
    return wrap(async () => {
      const secret = requireSecret(testMode);
      let recipientCode: string;
      if (input.destination.kind === "recipient_code") {
        recipientCode = input.destination.code;
      } else {
        const account = input.destination.account;
        const recipient = await getTransferRecipient(
          account.bankCode,
          account.accountNumber,
          account.accountName,
          secret,
        );
        recipientCode = recipient.recipientCode;
      }
      const transfer = await initiateTransfer(
        input.amountKobo,
        recipientCode,
        input.reference,
        secret,
      );
      return {
        transferCode: transfer.transferCode,
        providerReference: null,
        provider: "PAYSTACK",
        testMode,
      };
    });
  },
};
