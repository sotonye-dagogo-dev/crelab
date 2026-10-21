import { monnifyAdapter } from "@/lib/payments/monnify";
import { paystackAdapter } from "@/lib/payments/paystack";
import {
  normalizePaymentProviders,
  providerSettings,
  PAYMENT_PROVIDER_LABELS,
} from "@/lib/payments/config";
import {
  PaymentProviderUnavailableError,
  type PaymentProviderAdapter,
  type PaymentProviderId,
  type PaymentRuntime,
} from "@/lib/payments/types";
import type { IPaymentProvidersConfig } from "@/types";

const adapters: Record<PaymentProviderId, PaymentProviderAdapter> = {
  PAYSTACK: paystackAdapter,
  MONNIFY: monnifyAdapter,
};

export function getAdapter(provider: PaymentProviderId): PaymentProviderAdapter {
  return adapters[provider];
}

function isUsable(provider: PaymentProviderId, testMode: boolean): boolean {
  const adapter = adapters[provider];
  return adapter.supportsTestMode || !testMode ? adapter.isConfigured(testMode) : false;
}

/**
 * Pure routing decision so it can be unit-tested without a DB.
 * Order: active (enabled + credentials) → fallback (enabled + credentials).
 */
export function choosePaymentRuntime(
  rawConfig: IPaymentProvidersConfig | undefined,
): PaymentRuntime {
  const config = normalizePaymentProviders(rawConfig);
  const active = config.active;
  const activeSettings = providerSettings(config, active);

  if (activeSettings.enabled && isUsable(active, activeSettings.testMode)) {
    return { provider: active, testMode: activeSettings.testMode, fallbackFrom: null };
  }

  const fallback = config.fallback;
  const fallbackSettings = providerSettings(config, fallback);
  if (
    fallback !== active &&
    fallbackSettings.enabled &&
    isUsable(fallback, fallbackSettings.testMode)
  ) {
    return {
      provider: fallback,
      testMode: fallbackSettings.testMode,
      fallbackFrom: active,
    };
  }

  throw new PaymentProviderUnavailableError(
    `No payment provider is available. Enable ${PAYMENT_PROVIDER_LABELS[active]} or ` +
      `${PAYMENT_PROVIDER_LABELS[fallback]} and configure its credentials.`,
  );
}

/**
 * Runtime for money that already moved with a specific provider (refunds,
 * payouts, reconciliation). Never falls back — sending a refund to another
 * processor would be an unaudited fund movement.
 */
export function getRecordedRuntime(
  provider: PaymentProviderId,
  testMode: boolean,
): { runtime: PaymentRuntime; adapter: PaymentProviderAdapter } {
  const adapter = adapters[provider];
  if (!isUsable(provider, testMode)) {
    throw new PaymentProviderUnavailableError(
      `${PAYMENT_PROVIDER_LABELS[provider]} credentials for ${
        testMode ? "test" : "live"
      } mode are not configured; cannot complete this operation.`,
    );
  }
  return { runtime: { provider, testMode, fallbackFrom: null }, adapter };
}

export async function verifyPaymentRecord(
  provider: PaymentProviderId,
  testMode: boolean,
  reference: string,
) {
  const { adapter } = getRecordedRuntime(provider, testMode);
  return adapter.verifyTransaction(reference, testMode);
}

export { adapters as paymentAdapters };
