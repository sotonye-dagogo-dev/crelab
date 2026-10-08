"use client";

import { useEffect } from "react";
import {
  REFERRAL_COOKIE,
  REFERRAL_COOKIE_MAX_AGE,
  normalizeReferralCode,
} from "@/lib/referral-cookie";

/**
 * Captures `?ref=CODE` from any entry point (share link, email, social post)
 * into the `crellab_ref` cookie and strips the parameter from the URL. Runs
 * once on mount; sign-up later posts to `/api/referrals/claim`, which reads and
 * clears the cookie. Reads `window.location` directly so the root layout never
 * needs a `useSearchParams` Suspense boundary.
 */
export function ReferralCapture() {
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const code = normalizeReferralCode(url.searchParams.get("ref"));
      if (!code) return;

      document.cookie = `${REFERRAL_COOKIE}=${encodeURIComponent(code)}; path=/; max-age=${REFERRAL_COOKIE_MAX_AGE}; samesite=lax`;

      // Strip the param without a navigation or an RSC round-trip.
      url.searchParams.delete("ref");
      window.history.replaceState(window.history.state, "", url.toString());
    } catch {
      /* capture is best-effort — never break the page */
    }
  }, []);

  return null;
}
