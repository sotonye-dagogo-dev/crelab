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

export function isProviderUsable(
  provider: PaymentProviderId,
  testMode: boolean,
): boolean {
  const adapter = adapters[provider];
  return adapter.supportsTestMode || !testMode ? adapter.isConfigured(testMode) : false;
}

const isUsable = isProviderUsable;

/**
 * Pure routing decision so it can be unit-tested without a DB.
 * Order: active (enabled + credentials) → fallback (enabled + credentials).
 *
 * Safety: when the active provider is enabled but unusable (missing
 * credentials), the fallback must run in the SAME environment. Silently
 * switching from sandbox to live (or vice versa) would either charge real money
 * during a "test mode" run or make a live checkout silently free — both are
 * unacceptable. A mismatched fallback therefore fails loudly instead.
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
  const fallbackUsable =
    fallback !== active &&
    fallbackSettings.enabled &&
    isUsable(fallback, fallbackSettings.testMode);

  // Only guard the "active was meant to handle this but its credentials are
  // missing" case. A deliberately disabled active provider is an explicit
  // admin choice to route to the fallback's own configured environment.
  if (
    fallbackUsable &&
    activeSettings.enabled &&
    fallbackSettings.testMode !== activeSettings.testMode
  ) {
    throw new PaymentProviderUnavailableError(
      `${PAYMENT_PROVIDER_LABELS[active]} is enabled in ${
        activeSettings.testMode ? "test" : "live"
      } mode but its credentials are missing, and ${PAYMENT_PROVIDER_LABELS[fallback]} ` +
        `is configured for ${fallbackSettings.testMode ? "test" : "live"} mode. ` +
        "Payments are paused to avoid switching between sandbox and live.",
    );
  }

  if (fallbackUsable) {
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
