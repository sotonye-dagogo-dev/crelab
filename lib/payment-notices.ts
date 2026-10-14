/**
 * Config-driven payment notices/disclaimers (`payments.notices.*`).
 *
 * Three fixed notices surface where users act on payment decisions:
 * - `payoutDetails`    — bank/payout accuracy disclaimer (withdraw flow, terms)
 * - `processingFees`  — platform fee + processing-fee transparency (terms, docs)
 * - `escrowExplainer`  — sanitized escrow + payout-rail story (booking drawer, docs)
 *
 * Resolution follows the established merge pattern (`resolveEmailTemplate`,
 * `resolveWebinarsConfig`): hardcoded DEFAULT_CONFIG under any DB-saved value so
 * a partial/older saved row can never drop a notice, token-filled from the LIVE
 * config at the render boundary (`{{name}}`, `{{feeRate}}`, `{{escrowWindow}}`),
 * and `null` when a notice is disabled or empty so render sites skip cleanly.
 */
import { DEFAULT_CONFIG } from "@/config/platform.config";
import { fillConfigCopy } from "@/lib/platform-copy";
import type { IPlatformConfig, IPaymentNotice } from "@/types";

export const PAYMENT_NOTICE_KEYS = [
  "payoutDetails",
  "processingFees",
  "escrowExplainer",
] as const;

export type PaymentNoticeKey = (typeof PAYMENT_NOTICE_KEYS)[number];

export interface ResolvedPaymentNotice {
  key: PaymentNoticeKey;
  title: string;
  body: string;
}

type NoticeConfig = Pick<
  IPlatformConfig,
  "name" | "feeRate" | "escrowReleaseDays" | "payments"
>;

/** Resolve + token-fill one notice; `null` when disabled or entirely empty. */
export function resolvePaymentNotice(
  config: NoticeConfig,
  key: PaymentNoticeKey,
): ResolvedPaymentNotice | null {
  const base = DEFAULT_CONFIG.payments?.notices?.[key];
  const saved = config.payments?.notices?.[key];
  const merged: IPaymentNotice = { ...base, ...saved } as IPaymentNotice;

  if (merged?.enabled === false) return null;

  const vars = {
    name: config.name,
    escrowReleaseDays: config.escrowReleaseDays,
    feeRate: config.feeRate,
  };
  const title = fillConfigCopy((merged?.title ?? "").trim(), vars);
  const body = fillConfigCopy((merged?.body ?? "").trim(), vars);
  if (!title && !body) return null;

  return { key, title, body };
}

/** Every enabled notice, in `PAYMENT_NOTICE_KEYS` order (stable for rendering). */
export function resolvePaymentNotices(config: NoticeConfig): ResolvedPaymentNotice[] {
  return PAYMENT_NOTICE_KEYS.map((key) => resolvePaymentNotice(config, key)).filter(
    (notice): notice is ResolvedPaymentNotice => notice !== null,
  );
}
