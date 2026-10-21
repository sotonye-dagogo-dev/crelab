"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlatformConfig } from "@/lib/config-context";
import { resolveConfiguredAvailability } from "@/lib/payments/status";

export interface PublicPaymentStatus {
  available: boolean;
  testMode: boolean;
  fallbackUsed: boolean;
  bankTransferAvailable: boolean;
}

const CACHE_TTL_MS = 30_000;

let cache: { value: PublicPaymentStatus; at: number } | null = null;
let inflight: Promise<PublicPaymentStatus | null> | null = null;

async function loadStatus(force = false): Promise<PublicPaymentStatus | null> {
  if (!force && cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch("/api/payments/status", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      const data = json?.data as PublicPaymentStatus | undefined;
      if (!data || typeof data.available !== "boolean") return null;
      const value: PublicPaymentStatus = {
        available: data.available,
        testMode: data.testMode === true,
        fallbackUsed: data.fallbackUsed === true,
        bankTransferAvailable: data.bankTransferAvailable !== false,
      };
      cache = { value, at: Date.now() };
      return value;
    } catch {
      // Status is advisory — a failed probe must not block a payment attempt.
      return null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/**
 * Shared payment-rail status for user-facing money surfaces.
 *
 * The first paint can already conclude "unavailable" from the admin toggles in
 * the public config (no credentials needed), then the server probe refines it
 * with real credential availability. A failed probe leaves `status === null`
 * (unknown) rather than falsely disabling payments.
 */
export function usePaymentStatus() {
  const config = usePlatformConfig();
  const configured = resolveConfiguredAvailability(config.payments?.provider);

  const [status, setStatus] = useState<PublicPaymentStatus | null>(() => {
    if (configured.allDisabled) {
      return {
        available: false,
        testMode: false,
        fallbackUsed: false,
        bankTransferAvailable: false,
      };
    }
    return cache?.value ?? null;
  });
  const [loading, setLoading] = useState(status === null);
  const [error, setError] = useState(false);

  const refresh = useCallback(async (force = true) => {
    setLoading(true);
    const next = await loadStatus(force);
    if (next) {
      setStatus(next);
      setError(false);
    } else {
      setError(true);
      if (configured.allDisabled) {
        setStatus({
          available: false,
          testMode: false,
          fallbackUsed: false,
          bankTransferAvailable: false,
        });
      }
    }
    setLoading(false);
  }, [configured.allDisabled]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next = await loadStatus();
      if (cancelled) return;
      if (next) {
        setStatus(next);
        setError(false);
      } else if (configured.allDisabled) {
        setStatus({
          available: false,
          testMode: false,
          fallbackUsed: false,
          bankTransferAvailable: false,
        });
      } else {
        setError(true);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [configured.allDisabled]);

  return { status, loading, error, refresh };
}

/** Drop the cached snapshot (e.g. after an admin changes routing in-session). */
export function invalidatePaymentStatusCache(): void {
  cache = null;
}
