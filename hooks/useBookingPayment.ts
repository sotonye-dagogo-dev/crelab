"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/lib/toast";

/**
 * Shared booking-payment flow used by the booking drawer AND the booking
 * detail pay panel — one implementation of the money path so the two surfaces
 * can never diverge.
 *
 * Safety rules baked in (see repair-system: "Payment Truthfulness: verify,
 * don't assume"):
 *  - confirmation ALWAYS comes from server-side `/pay/verify` (the webhook
 *    remains the primary finalizer) — never from the popup callback alone;
 *  - Paystack popup handlers are registered BEFORE `resume()` so a fast
 *    success can't be missed;
 *  - `isPaying` covers the whole lifecycle (including an in-flight popup or
 *    hosted tab) so a second competing charge can't be started, but a
 *    terminal outcome always releases it so the user can retry;
 *  - a watchdog releases a stuck popup handoff (no event ever fired) with a
 *    truthful "check your bookings" message instead of a spinner forever;
 *  - every failure path surfaces a toast that tells the user what to do next.
 */

export type PayOutcome =
  /** Server-verified — money is held in escrow. */
  | "paid"
  /** Checkout handed off (popup/hosted tab) — result arrives asynchronously. */
  | "in-flight"
  /** Terminal failure (or timeout) — safe to stop loading and let the user retry. */
  | "failed";

interface VerifyOutcome {
  done: boolean;
  retry: boolean;
  message?: string;
}

interface PaystackPopInstance {
  resume: (code: string) => void;
  on: (event: string, cb: (resp?: { reference?: string }) => void) => void;
}

const HOSTED_POLL_ATTEMPTS = 30;
const HOSTED_POLL_INTERVAL_MS = 4000;
/** Watchdog for a popup handoff whose events never arrive (3 minutes). */
const POPUP_WATCHDOG_MS = 3 * 60 * 1000;

export interface IUseBookingPayment {
  /** Pay from the wallet balance (synchronous server-side debit + escrow hold). */
  payWithWallet: (bookingId: string) => Promise<PayOutcome>;
  /** Start Paystack checkout (inline popup, hosted new-tab fallback). */
  payWithCard: (bookingId: string) => Promise<PayOutcome>;
  /** True from the moment money starts moving until a terminal outcome. */
  isPaying: boolean;
  /** Flips true once server-side verification confirms the charge. */
  paid: boolean;
  /** Clear `paid` (used when a flow resets back to its start). */
  reset: () => void;
}

export function useBookingPayment(): IUseBookingPayment {
  const [isPaying, setIsPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const { toast } = useToast();

  // Synchronous mirrors of the async state — entry guards read these so a
  // double-click can't race React's re-render.
  const isPayingRef = useRef(false);
  const paidRef = useRef(false);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Booking id for the attempt in flight — verify callbacks read it long after
   *  the call that started it (the caller may have created the booking in the
   *  same tick, before React state flushed). */
  const activeBookingIdRef = useRef<string | null>(null);

  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  }, []);

  useEffect(() => clearWatchdog, [clearWatchdog]);

  const finishAttempt = useCallback(() => {
    isPayingRef.current = false;
    setIsPaying(false);
    clearWatchdog();
  }, [clearWatchdog]);

  const reset = useCallback(() => {
    clearWatchdog();
    isPayingRef.current = false;
    paidRef.current = false;
    activeBookingIdRef.current = null;
    setIsPaying(false);
    setPaid(false);
  }, [clearWatchdog]);

  const markPaid = useCallback(() => {
    if (paidRef.current) return;
    paidRef.current = true;
    setPaid(true);
    finishAttempt();
  }, [finishAttempt]);

  /** Terminal failure: release the loading state once, tell the user why. */
  const fail = useCallback(
    (message: string, tone: "error" | "info" = "error") => {
      finishAttempt();
      toast(message, tone);
      return "failed" as const;
    },
    [finishAttempt, toast],
  );

  /** Begin an attempt — false when one is already in flight or already paid. */
  const beginAttempt = useCallback(
    (bookingId: string): "ok" | "already-paid" | "busy" => {
      if (paidRef.current) return "already-paid";
      if (isPayingRef.current) return "busy";
      activeBookingIdRef.current = bookingId;
      isPayingRef.current = true;
      setIsPaying(true);
      return "ok";
    },
    [],
  );

  const checkVerify = useCallback(
    async (reference: string): Promise<VerifyOutcome> => {
      const activeId = activeBookingIdRef.current;
      if (!activeId) return { done: false, retry: false };
      const res = await fetch(
        `/api/bookings/${activeId}/pay/verify?reference=${encodeURIComponent(reference)}`,
      );
      const json = await res.json().catch(() => null);
      if (json?.success && json?.data?.verified) return { done: true, retry: false };

      if (json?.success) {
        const status = json.data?.status as string | undefined;
        if (status === "pending") return { done: false, retry: true };
        if (status === "failed") {
          return {
            done: false,
            retry: false,
            message: "Payment failed — you haven't been charged. Please try again.",
          };
        }
        return {
          done: false,
          retry: false,
          message: "Payment was not completed — you haven't been charged. You can try again.",
        };
      }

      const error = (json?.error as string | undefined) ?? "";
      // Transient processor/network errors are worth retrying; ownership,
      // mismatch and validation failures are definitive.
      if (res.status >= 500 || /could not verify/i.test(error)) {
        return { done: false, retry: true, message: error || undefined };
      }
      return {
        done: false,
        retry: false,
        message: error || "Payment could not be verified — check your Bookings page or try again.",
      };
    },
    [],
  );

  const payWithWallet = useCallback(
    async (bookingId: string): Promise<PayOutcome> => {
      if (!bookingId) return "failed";
      const started = beginAttempt(bookingId);
      if (started === "already-paid") return "paid";
      if (started === "busy") return "in-flight";

      try {
        const res = await fetch(`/api/bookings/${bookingId}/pay`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ useWallet: true }),
        });
        const json = await res.json().catch(() => null);
        if (json?.success) {
          markPaid();
          return "paid";
        }
        return fail(json?.error ?? "Could not pay from your wallet — please try again.");
      } catch {
        return fail("Could not reach the server — check your connection and try again.");
      }
    },
    [beginAttempt, fail, markPaid],
  );

  const payWithCard = useCallback(
    async (bookingId: string): Promise<PayOutcome> => {
      if (!bookingId) return "failed";
      const started = beginAttempt(bookingId);
      if (started === "already-paid") return "paid";
      if (started === "busy") return "in-flight";

      try {
        const res = await fetch(`/api/bookings/${bookingId}/pay`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const json = await res.json().catch(() => null);
        if (!json?.success) {
          return fail(json?.error ?? "Could not start payment — please try again.");
        }

        // Defensive: the server can settle from the wallet — treat it as an
        // immediate success rather than an error.
        if (json.data?.method === "WALLET") {
          markPaid();
          return "paid";
        }

        const { accessCode, reference, authorizationUrl } = (json.data ?? {}) as {
          accessCode?: string;
          reference?: string;
          authorizationUrl?: string;
        };

        if (!accessCode && !authorizationUrl) {
          return fail("Payment could not be started — please try again.");
        }

        const PaystackPop = (window as unknown as Record<string, unknown>)
          .PaystackPop as unknown as
          | (new () => PaystackPopInstance)
          | undefined;

        if (PaystackPop && accessCode) {
          const handler = new PaystackPop();
          // Handlers registered BEFORE resume so a fast success can't be missed.
          handler.on("success", (resp) => {
            void (async () => {
              try {
                const outcome = await checkVerify(resp?.reference ?? reference ?? "");
                if (outcome.done) {
                  markPaid();
                } else {
                  fail(
                    outcome.message ??
                      "Payment could not be verified — check your Bookings page or try again.",
                    outcome.retry ? "info" : "error",
                  );
                }
              } catch {
                fail("Payment could not be verified — check your Bookings page or try again.");
              }
            })();
          });
          handler.on("cancel", () => {
            if (isPayingRef.current) {
              fail("Payment cancelled — you can try again whenever you're ready.", "info");
            }
          });
          handler.on("error", () => {
            if (isPayingRef.current) {
              fail("Something went wrong with the payment. Please try again.");
            }
          });
          handler.resume(accessCode);

          // Safety net: if no popup event ever fires (blocked/aborted checkout),
          // stop pretending payment is in progress instead of spinning forever.
          clearWatchdog();
          watchdogRef.current = setTimeout(() => {
            if (isPayingRef.current) {
              fail(
                "We haven't received a payment confirmation yet. If you completed it, it will show up on your Bookings page shortly.",
                "info",
              );
            }
          }, POPUP_WATCHDOG_MS);

          // Result arrives via the handlers above — loading stays on meanwhile.
          return "in-flight";
        }

        // No popup library — open the hosted checkout in a NEW tab so this
        // surface stays intact, then poll until Paystack settles it (the webhook
        // finalizes server-side regardless).
        if (authorizationUrl && reference) {
          const opened = window.open(authorizationUrl, "_blank", "noopener,noreferrer");
          if (!opened) {
            // Pop-up blocked — last resort: full-page redirect (callback_url lands
            // on /bookings where status is rendered server-side).
            finishAttempt();
            window.location.assign(authorizationUrl);
            return "in-flight";
          }

          for (let attempt = 0; attempt < HOSTED_POLL_ATTEMPTS; attempt++) {
            await new Promise((resolve) => setTimeout(resolve, HOSTED_POLL_INTERVAL_MS));
            const outcome = await checkVerify(reference);
            if (outcome.done) {
              markPaid();
              return "paid";
            }
            if (!outcome.retry) {
              return fail(
                outcome.message ?? "Payment was not completed — you can try again.",
                "info",
              );
            }
          }

          return fail(
            "We couldn't confirm the payment yet. It completes automatically once confirmed — check your Bookings page in a few minutes.",
            "info",
          );
        }

        return fail("Payment could not be started — please try again.");
      } catch {
        return fail("Could not reach the server — check your connection and try again.");
      }
    },
    [beginAttempt, checkVerify, clearWatchdog, fail, finishAttempt, markPaid],
  );

  return { payWithWallet, payWithCard, isPaying, paid, reset };
}
