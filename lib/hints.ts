import type { IPlatformConfig } from "@/types";
import { fillConfigCopy } from "@/lib/platform-copy";

/**
 * Config-driven copy for info-icon tooltips (`ClInfoTip` placements).
 *
 * WHY: the money-path surfaces need short "why is this number/action here"
 * explanations (fees, escrow, release window, disputes, wallet balances,
 * audit trails). Hardcoding that copy at each call site would make it
 * un-editable without a deploy and impossible to tune per-tenant; this module
 * keeps ONE default per tip key and lets the admin override (or hide) any of
 * them through `config.hints.copy` — the same pattern as the `payments.notices`
 * block, with the same `{{name}}` / `{{feeRate}}` / `{{escrowWindow}}` tokens
 * filled at resolve time from the live config.
 *
 * An override of `""` HIDES that tip (the placement component checks for null
 * and renders nothing), so an admin can switch off a single noisy tip without
 * touching code.
 */

export type HintKey =
  /** "Why is there a fee on my booking total?" (pay panel / fee breakdown) */
  | "bookingFee"
  /** "How does escrow protect my payment?" (pay panel) */
  | "bookingEscrow"
  /** "When exactly are funds released?" (escrow timeline countdown) */
  | "releaseWindow"
  /** "What happens if the work is wrong?" (escrow timeline dispute button) */
  | "bookingDispute"
  /** "Where does my wallet balance come from?" (wallet page balance card) */
  | "walletBalance"
  /** "How do withdrawals work / when do they arrive?" (wallet withdraw) */
  | "walletWithdraw"
  /** "What does 'held in escrow' mean on my dashboard?" (provider dashboard) */
  | "dashboardEscrow"
  /** "Who can see this audit trail / what is it?" (admin finance audit) */
  | "financeAudit";

/**
 * Built-in defaults. Each string may contain `{{name}}`, `{{feeRate}}` and
 * `{{escrowWindow}}` tokens, filled from the live config at resolve time.
 */
export const DEFAULT_HINTS: Record<HintKey, string> = {
  bookingFee:
    "Every booking includes a {{feeRate}}% platform service fee, shown before you pay. Payment processing charges on bookings are borne by the platform — the creator is paid the booking total minus this fee, with no hidden deductions.",
  bookingEscrow:
    "Your payment is held securely in escrow under our release policy — the creator is only paid once you approve the work, or automatically {{escrowWindow}} after the service date when no dispute is raised.",
  releaseWindow:
    "Funds release {{escrowWindow}} after the service date when no dispute is raised. You can also release them yourself at any point once the work is in progress.",
  bookingDispute:
    "If the delivered work doesn't match the agreed scope, you can raise a dispute before funds are released — an admin reviews the case and decides whether to release or refund.",
  walletBalance:
    "Your wallet holds released payouts and top-ups. Funds from completed bookings land here automatically once escrow is released.",
  walletWithdraw:
    "Withdrawals are sent to the bank account details you provide. Payouts to incorrect details cannot be recovered — double-check before you withdraw.",
  dashboardEscrow:
    "Funds shown as 'held in escrow' are secured for active bookings — they're released to you once the client approves the work (or automatically after the release window with no dispute).",
  financeAudit:
    "Every money movement writes an audit entry here — booking-level and per-transaction — so settlements, refunds and reconciles are traceable to who acted and when.",
};

/** Built-in tip keys, for iteration/tests. */
export const HINT_KEYS = Object.keys(DEFAULT_HINTS) as HintKey[];

/**
 * Resolve the copy for one tip key, or `null` when the tip should not render
 * (master switch off, or an empty-string override hides it). Tokens are filled
 * from the live config so admin edits to name/fee/escrow window track without
 * a deploy.
 */
export function resolveHint(
  key: HintKey,
  config: Pick<IPlatformConfig, "name" | "feeRate" | "escrowReleaseDays" | "hints">,
): string | null {
  if (config.hints?.enabled === false) return null;
  const override = config.hints?.copy?.[key];
  if (typeof override === "string") {
    if (override.trim() === "") return null; // explicit hide
    return fillConfigCopy(override, {
      name: config.name,
      feeRate: config.feeRate,
      escrowReleaseDays: config.escrowReleaseDays,
    });
  }
  return fillConfigCopy(DEFAULT_HINTS[key], {
    name: config.name,
    feeRate: config.feeRate,
    escrowReleaseDays: config.escrowReleaseDays,
  });
}
