/**
 * Referral capture cookie — shared by the client-side `ReferralCapture`
 * component and the server-side claim endpoint. Kept free of server imports so
 * it is safe to pull into a `"use client"` bundle.
 */

/** Browser cookie that carries `?ref=CODE` from any entry point to sign-up. */
export const REFERRAL_COOKIE = "crellab_ref";
/** Cookie lifetime (30 days) — long enough for a deferred sign-up. */
export const REFERRAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

/**
 * Cookie/query values are attacker-controlled — only accept an opaque code we
 * could actually have issued (URL-safe, 4–64 chars).
 */
export function normalizeReferralCode(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!/^[A-Za-z0-9_-]{4,64}$/.test(trimmed)) return null;
  return trimmed;
}

/**
 * Pure carrier resolution for the claim endpoint: the `crellab_ref` cookie is
 * the primary carrier, a JSON `{ code }` body is the fallback (e.g. when the
 * cookie never landed). Returns the first well-formed code, or null.
 */
export function resolveClaimCode(
  cookieCode: string | null | undefined,
  bodyCode: string | null | undefined,
): string | null {
  return normalizeReferralCode(cookieCode) ?? normalizeReferralCode(bodyCode);
}
