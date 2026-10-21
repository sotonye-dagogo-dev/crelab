/**
 * Pure payment-availability + test-mode copy helpers.
 *
 * Two distinct concerns live here so every surface agrees:
 *  - **Availability from config** — can any provider be selected at all
 *    (admin toggles)? This is safe to evaluate client-side from the public
 *    config payload and is used to disable money CTAs immediately.
 *  - **Status copy** — admin-editable banner text for the three operational
 *    states users/admins must be told about: no usable provider, sandbox/test
 *    mode, and a fallback provider handling traffic.
 *
 * The authoritative runtime answer (credentials included) comes from
 * `PaymentProviderService.getStatus()`; this module never touches the DB or
 * environment and therefore has zero service dependencies.
 */
import { DEFAULT_CONFIG } from "@/config/platform.config";
import { fillConfigCopy } from "@/lib/platform-copy";
import {
  normalizePaymentProviders,
  providerSettings,
} from "@/lib/payments/config";
import type {
  IPaymentProvidersConfig,
  IPaymentStatusConfig,
  IPlatformConfig,
  PaymentProviderId,
} from "@/types";

export type PaymentStatusCopyKey =
  | "userTestMode"
  | "unavailable"
  | "userFallback"
  | "adminTestMode"
  | "adminUnavailable"
  | "adminFallback";

export interface ResolvedPaymentStatusCopy {
  key: PaymentStatusCopyKey;
  enabled: boolean;
  title: string;
  body: string;
}

export interface PaymentStatusCopyVars {
  name?: string;
  /** Intended/active provider display label (admin copy only). */
  provider?: string;
  /** Fallback provider that actually handled the money (admin copy only). */
  fallback?: string;
  escrowReleaseDays?: number;
  feeRate?: number;
}

/** Fill `{{provider}}` / `{{fallback}}` tokens after the standard config tokens. */
export function fillPaymentStatusTokens(
  text: string,
  vars: PaymentStatusCopyVars = {},
): string {
  let out = fillConfigCopy(text, {
    name: vars.name ?? DEFAULT_CONFIG.name,
    escrowReleaseDays: vars.escrowReleaseDays,
    feeRate: vars.feeRate,
  });
  if (vars.provider) out = out.split("{{provider}}").join(vars.provider);
  if (vars.fallback) out = out.split("{{fallback}}").join(vars.fallback);
  return out;
}

const COPY_FIELDS: Record<
  PaymentStatusCopyKey,
  { enabled?: keyof IPaymentStatusConfig; title: keyof IPaymentStatusConfig; body: keyof IPaymentStatusConfig }
> = {
  userTestMode: {
    enabled: "userTestModeNoticeEnabled",
    title: "userTestModeTitle",
    body: "userTestModeBody",
  },
  unavailable: { title: "unavailableTitle", body: "unavailableBody" },
  userFallback: {
    enabled: "userFallbackNoticeEnabled",
    title: "userFallbackTitle",
    body: "userFallbackBody",
  },
  adminTestMode: { title: "adminTestModeTitle", body: "adminTestModeBody" },
  adminUnavailable: { title: "adminUnavailableTitle", body: "adminUnavailableBody" },
  adminFallback: { title: "adminFallbackTitle", body: "adminFallbackBody" },
};

function statusConfig(config: IPlatformConfig): IPaymentStatusConfig {
  const fallback = DEFAULT_CONFIG.payments?.status as IPaymentStatusConfig;
  const saved = config.payments?.status;
  return { ...fallback, ...(saved ?? {}) };
}

/**
 * Resolve one banner. Missing/blank DB values inherit the shipped defaults so a
 * partial or legacy save can never make a banner render blank.
 */
export function resolvePaymentStatusCopy(
  config: IPlatformConfig,
  key: PaymentStatusCopyKey,
  vars: PaymentStatusCopyVars = {},
): ResolvedPaymentStatusCopy {
  const status = statusConfig(config);
  const fields = COPY_FIELDS[key];
  const defaults = DEFAULT_CONFIG.payments?.status as IPaymentStatusConfig;

  const pick = (field: keyof IPaymentStatusConfig): string => {
    const value = status[field];
    return typeof value === "string" && value.trim().length > 0
      ? value
      : (defaults[field] as string);
  };

  const enabled =
    fields.enabled === undefined ? true : status[fields.enabled] !== false;

  return {
    key,
    enabled,
    title: fillPaymentStatusTokens(pick(fields.title), {
      name: config.name,
      escrowReleaseDays: config.escrowReleaseDays,
      feeRate: config.feeRate,
      ...vars,
    }),
    body: fillPaymentStatusTokens(pick(fields.body), {
      name: config.name,
      escrowReleaseDays: config.escrowReleaseDays,
      feeRate: config.feeRate,
      ...vars,
    }),
  };
}

export interface ConfiguredPaymentAvailability {
  active: PaymentProviderId;
  fallback: PaymentProviderId;
  activeEnabled: boolean;
  fallbackEnabled: boolean;
  /** At least one admin toggle is on (credentials are not checked here). */
  anyEnabled: boolean;
  /** Both providers are disabled — every rail (including bank top-up) is off. */
  allDisabled: boolean;
}

/**
 * Config-only availability, safe for client components. A provider can still be
 * unusable at runtime when its credentials are missing; the server status
 * endpoint is the authoritative source for that case.
 */
export function resolveConfiguredAvailability(
  raw: IPaymentProvidersConfig | undefined,
): ConfiguredPaymentAvailability {
  const config = normalizePaymentProviders(raw);
  const activeEnabled = providerSettings(config, config.active).enabled;
  const fallbackEnabled = providerSettings(config, config.fallback).enabled;
  return {
    active: config.active,
    fallback: config.fallback,
    activeEnabled,
    fallbackEnabled,
    anyEnabled: activeEnabled || fallbackEnabled,
    allDisabled: !activeEnabled && !fallbackEnabled,
  };
}
