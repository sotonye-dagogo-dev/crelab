"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { REFERRAL_COOKIE } from "@/lib/referral-cookie";

function readReferralCookie(): string | null {
  try {
    const parts = document.cookie.split(";");
    for (const part of parts) {
      const [name, ...rest] = part.trim().split("=");
      if (name === REFERRAL_COOKIE) {
        const value = decodeURIComponent(rest.join("="));
        if (value) return value;
      }
    }
  } catch {
    /* best-effort — never break the page */
  }
  return null;
}

/**
 * Auth-agnostic referral attribution. The sign-up form (`/register`) fires the
 * claim explicitly, but that misses real flows: OAuth sign-ins that start from
 * `/login`, users who abandon the register step-2 screen, referral links opened
 * in another tab after sign-up, or a claim request that failed on flaky
 * network. This mount runs on every page (via the root layout) and, once the
 * viewer is authenticated, attempts the idempotent claim whenever the
 * `crellab_ref` cookie is still present. The endpoint clears the cookie
 * afterwards, so a later account on the same browser can't reuse it — and
 * replaying the claim inserts nothing (unique index on
 * user/invitee/degree/source).
 */
export function ReferralClaimOnAuth() {
  const { isAuthenticated, isLoading } = useAuth();
  const attempted = useRef(new Set<string>());

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    const code = readReferralCookie();
    if (!code || attempted.current.has(code)) return;
    attempted.current.add(code);

    fetch("/api/referrals/claim", { method: "POST" }).catch(() => {
      // Non-blocking — the next authenticated mount retries while the cookie
      // survives (the endpoint only clears it once the claim is processed).
      attempted.current.delete(code);
    });
  }, [isAuthenticated, isLoading]);

  return null;
}
