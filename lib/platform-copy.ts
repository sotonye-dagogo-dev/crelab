/**
 * Platform-name copy helpers (F9 platform-name compliance).
 *
 * `config.name` (config/platform.config.ts, served by PlatformConfigService) is
 * the single source of truth for the platform's display name. Display copy that
 * can read config at render time interpolates `config.name` directly. Copy that
 * lives in a module-scope constant (which cannot await config) carries
 * `PLATFORM_NAME_TOKEN` instead and is resolved with `fillPlatformName` at its
 * call site.
 *
 * Infrastructure identifiers (cookie names, e-mail domains, payment refs, storage
 * keys) are deliberately NOT copy: they stay literal and are allowlisted in
 * __tests__/platform-name-compliance.test.ts.
 */

export const PLATFORM_NAME_TOKEN = "{{name}}";
/** Render-time escrow window from `config.escrowReleaseDays`, pre-pluralised ("1 day" / "5 days"). */
export const ESCROW_WINDOW_TOKEN = "{{escrowWindow}}";
/** Render-time platform fee from `config.feeRate` as a percent number ("5" for 0.05). */
export const FEE_RATE_TOKEN = "{{feeRate}}";

export function fillPlatformName(text: string, name: string): string {
  return text.split(PLATFORM_NAME_TOKEN).join(name);
}

export interface ConfigCopyVars {
  name: string;
  escrowReleaseDays?: number;
  feeRate?: number;
}

/** `"1 day"` / `"5 days"` — clamped to a sane positive integer, defaulted to 1. */
export function formatEscrowWindow(days: number): string {
  const safe = Number.isFinite(days) && days >= 1 ? Math.trunc(days) : 1;
  return safe === 1 ? "1 day" : `${safe} days`;
}

/** 0.05 → "5"; 0.075 → "7.5"; non-finite → "" (token left unfilled only if feeRate absent). */
export function formatFeeRatePercent(feeRate: number): string {
  const pct = feeRate * 100;
  return Number.isFinite(pct) ? String(Number(pct.toFixed(2))) : "";
}

/**
 * Fill render-time config tokens in admin-managed copy: `{{name}}`,
 * `{{escrowWindow}}` (auto-release window) and `{{feeRate}}` (platform fee as a
 * percent). Values resolve from the LIVE config at the render boundary, so both
 * module-scope defaults and DB-saved content track admin edits without a deploy
 * (mirrors the `{{name}}` pattern; each token fills only when its var is given).
 */
export function fillConfigCopy(text: string, vars: ConfigCopyVars): string {
  let out = fillPlatformName(text, vars.name);
  if (vars.escrowReleaseDays !== undefined) {
    out = out.split(ESCROW_WINDOW_TOKEN).join(formatEscrowWindow(vars.escrowReleaseDays));
  }
  if (vars.feeRate !== undefined) {
    out = out.split(FEE_RATE_TOKEN).join(formatFeeRatePercent(vars.feeRate));
  }
  return out;
}
