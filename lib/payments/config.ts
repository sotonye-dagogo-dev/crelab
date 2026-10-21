import { DEFAULT_CONFIG } from "@/config/platform.config";
import type {
  IPaymentProviderSettings,
  IPaymentProvidersConfig,
  IPaymentsConfig,
  PaymentProviderId,
} from "@/types";

export const PAYMENT_PROVIDER_IDS: readonly PaymentProviderId[] = [
  "PAYSTACK",
  "MONNIFY",
] as const;

export const PAYMENT_PROVIDER_LABELS: Record<PaymentProviderId, string> = {
  PAYSTACK: "Paystack",
  MONNIFY: "Monnify",
};

export function isPaymentProviderId(value: unknown): value is PaymentProviderId {
  return (
    typeof value === "string" &&
    (PAYMENT_PROVIDER_IDS as readonly string[]).includes(value.toUpperCase())
  ) as boolean;
}

export function asPaymentProviderId(value: unknown): PaymentProviderId | null {
  if (typeof value !== "string") return null;
  const upper = value.toUpperCase();
  return (PAYMENT_PROVIDER_IDS as readonly string[]).includes(upper)
    ? (upper as PaymentProviderId)
    : null;
}

function normalizeSettings(raw: unknown): IPaymentProviderSettings {
  if (!raw || typeof raw !== "object") return { enabled: false, testMode: false };
  const obj = raw as Record<string, unknown>;
  return {
    enabled: obj.enabled === true,
    testMode: obj.testMode === true,
  };
}

/**
 * Coerces persisted/admin config into a complete provider block. Older configs
 * (saved before multi-provider support) inherit the Paystack defaults so a
 * deploy can never leave the platform without a usable rail.
 */
export function providerSettings(
  config: IPaymentProvidersConfig,
  id: PaymentProviderId,
): IPaymentProviderSettings {
  return id === "PAYSTACK" ? config.providers.paystack : config.providers.monnify;
}

export function normalizePaymentProviders(raw: unknown): IPaymentProvidersConfig {
  const defaults = DEFAULT_CONFIG.payments?.provider as IPaymentProvidersConfig;
  if (!raw || typeof raw !== "object") return defaults;
  const obj = raw as Record<string, unknown>;
  const rawProviders =
    obj.providers && typeof obj.providers === "object"
      ? (obj.providers as Record<string, unknown>)
      : {};
  return {
    active: asPaymentProviderId(obj.active) ?? defaults.active,
    fallback: asPaymentProviderId(obj.fallback) ?? defaults.fallback,
    providers: {
      // Missing sub-keys inherit the platform defaults (Paystack live enabled)
      // rather than collapsing to "disabled" on a partial/legacy save.
      paystack: normalizeSettings(
        rawProviders.paystack ?? rawProviders.PAYSTACK ?? defaults.providers.paystack,
      ),
      monnify: normalizeSettings(
        rawProviders.monnify ?? rawProviders.MONNIFY ?? defaults.providers.monnify,
      ),
    },
  };
}

/** Normalises the whole `payments` config subtree (notices preserved). */
export function normalizePaymentsConfig(raw: unknown): IPaymentsConfig {
  const defaults = DEFAULT_CONFIG.payments as IPaymentsConfig;
  if (!raw || typeof raw !== "object") return defaults;
  const obj = raw as Partial<IPaymentsConfig> & Record<string, unknown>;
  return {
    ...defaults,
    ...obj,
    notices: {
      ...defaults.notices,
      ...(obj.notices ?? {}),
    },
    provider: normalizePaymentProviders(obj.provider),
  };
}
