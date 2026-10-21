import { PlatformConfigService } from "@/services/PlatformConfigService";
import {
  choosePaymentRuntime,
  isProviderUsable,
  paymentAdapters,
} from "@/lib/payments/runtime";
import {
  PAYMENT_PROVIDER_LABELS,
  normalizePaymentProviders,
  providerSettings,
} from "@/lib/payments/config";
import type {
  PaymentProviderAdapter,
  PaymentProviderId,
  PaymentRuntime,
} from "@/lib/payments/types";

export interface PaymentProviderModeStatus {
  enabled: boolean;
  testMode: boolean;
  /** Credentials for the configured mode are present in the environment. */
  configured: boolean;
}

export interface PaymentProviderStatus {
  /** At least one usable provider can take a new payment right now. */
  available: boolean;
  /** Provider that would handle the next checkout (null when none is usable). */
  provider: PaymentProviderId | null;
  providerLabel: string | null;
  testMode: boolean;
  /** Intended provider when a fallback handled the decision. */
  fallbackFrom: PaymentProviderId | null;
  fallbackFromLabel: string | null;
  /** True when the fallback (not the configured active provider) was selected. */
  fallbackUsed: boolean;
  active: PaymentProviderId;
  fallback: PaymentProviderId;
  providers: Record<PaymentProviderId, PaymentProviderModeStatus>;
  /** Bank-transfer top-ups use Paystack dedicated virtual accounts today. */
  bankTransferAvailable: boolean;
  /** Loud, admin-facing reason when no runtime can be resolved. */
  reason: string | null;
}

/**
 * Server-side payment routing + operational status. The pure decision lives in
 * `lib/payments/runtime.ts`; this service is the only layer allowed to read the
 * persisted platform config (lib must never depend on services).
 */
export class PaymentProviderService {
  static async getRuntime(): Promise<{
    runtime: PaymentRuntime;
    adapter: PaymentProviderAdapter;
  }> {
    const config = await PlatformConfigService.get();
    const runtime = choosePaymentRuntime(config.payments?.provider);
    return { runtime, adapter: paymentAdapters[runtime.provider] };
  }

  /**
   * Truthful environment snapshot for banners and admin diagnostics. Never
   * throws for an unusable rail — returns `available: false` + `reason` so the
   * UI can warn before a user attempts a doomed checkout.
   */
  static async getStatus(): Promise<PaymentProviderStatus> {
    const config = await PlatformConfigService.get();
    const providers = normalizePaymentProviders(config.payments?.provider);
    const activeSettings = providerSettings(providers, providers.active);
    const fallbackSettings = providerSettings(providers, providers.fallback);

    const modeStatus = (id: PaymentProviderId): PaymentProviderModeStatus => {
      const settings = providerSettings(providers, id);
      return {
        enabled: settings.enabled,
        testMode: settings.testMode,
        configured: isProviderUsable(id, settings.testMode),
      };
    };

    const providerStatus = {
      PAYSTACK: modeStatus("PAYSTACK"),
      MONNIFY: modeStatus("MONNIFY"),
    } satisfies Record<PaymentProviderId, PaymentProviderModeStatus>;

    const base = {
      active: providers.active,
      fallback: providers.fallback,
      providers: providerStatus,
      // Dedicated virtual accounts are a Paystack capability today; Monnify
      // reserved accounts are not implemented, so this rail needs Paystack.
      bankTransferAvailable:
        providerStatus.PAYSTACK.enabled && providerStatus.PAYSTACK.configured,
    };

    try {
      const runtime = choosePaymentRuntime(providers);
      return {
        ...base,
        available: true,
        provider: runtime.provider,
        providerLabel: PAYMENT_PROVIDER_LABELS[runtime.provider],
        testMode: runtime.testMode,
        fallbackFrom: runtime.fallbackFrom,
        fallbackFromLabel: runtime.fallbackFrom
          ? PAYMENT_PROVIDER_LABELS[runtime.fallbackFrom]
          : null,
        fallbackUsed: runtime.fallbackFrom !== null,
        reason: null,
      };
    } catch (err) {
      return {
        ...base,
        available: false,
        provider: null,
        providerLabel: null,
        testMode: activeSettings.enabled ? activeSettings.testMode : fallbackSettings.testMode,
        fallbackFrom: null,
        fallbackFromLabel: null,
        fallbackUsed: false,
        reason:
          err instanceof Error
            ? err.message
            : `No usable payment provider (${PAYMENT_PROVIDER_LABELS[providers.active]} / ${PAYMENT_PROVIDER_LABELS[providers.fallback]}).`,
      };
    }
  }
}
