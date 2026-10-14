"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ClSheet, ClButton, ClDialog, ClTextarea } from "@/components/ui";
import { usePlatformConfig } from "@/lib/config-context";
import { useToast } from "@/lib/toast";
import { resolvePaymentNotice } from "@/lib/payment-notices";
import { X, Check, ChevronRight } from "lucide-react";
import type { IServicePackage, IProvider } from "@/types";

export type BookingStep = "details" | "payment" | "confirmation";

interface BookingDrawerProps {
  open: boolean;
  onClose: () => void;
  selectedPackage: IServicePackage;
  provider: Pick<IProvider, "id" | "displayName">;
  clientId: string;
}

export function BookingDrawer({
  open,
  onClose,
  selectedPackage,
  provider,
  clientId,
}: BookingDrawerProps) {
  const [step, setStep] = useState<BookingStep>("details");
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [serviceDate, setServiceDate] = useState("");
  const [scopeNotes, setScopeNotes] = useState("");
  const [bookingId, setBookingId] = useState<string | null>(null);
  /** Snapshot of the details `bookingId` was created with — a retry reuses the
   *  booking only when the details still match (never pays a stale booking). */
  const [createdFor, setCreatedFor] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const platformConfig = usePlatformConfig();
  const { toast } = useToast();
  const paystackRef = useRef<HTMLDivElement>(null);

  const subtotal = selectedPackage.price;
  const feeKobo = Math.round(subtotal * platformConfig.feeRate);
  const totalKobo = subtotal + feeKobo;
  // Config-driven escrow explainer (replaces the hardcoded "held by Paystack"
  // line — accurate only if the operator keeps the notice enabled).
  const escrowNotice = resolvePaymentNotice(platformConfig, "escrowExplainer");

  const handleClose = useCallback(() => {
    if (step !== "details") {
      setShowExitDialog(true);
    } else {
      onClose();
      setStep("details");
      setServiceDate("");
      setScopeNotes("");
      setBookingId(null);
      setCreatedFor(null);
    }
  }, [step, onClose]);

  const handleConfirmExit = useCallback(() => {
    setShowExitDialog(false);
    setStep("details");
    setServiceDate("");
    setScopeNotes("");
    setBookingId(null);
    setCreatedFor(null);
    onClose();
  }, [onClose]);

  const handleSubmitDetails = useCallback(async () => {
    if (!serviceDate || isSubmitting) return;
    setIsSubmitting(true);
    // Popup path hands the outcome to Paystack's async callbacks — the button
    // must stay in its loading state until those fire (else a second click can
    // init a competing charge). Everything else resolves within this call.
    let keepLoading = false;
    try {
      const detailsKey = `${provider.id}|${selectedPackage.id}|${serviceDate}|${scopeNotes.trim()}`;
      // Reuse a booking created by an earlier failed attempt only when the
      // details still match — a retry must never create a duplicate booking,
      // and never pay a booking made from stale details.
      let currentBookingId = bookingId;
      if (!currentBookingId || createdFor !== detailsKey) {
        const res = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            providerId: provider.id,
            clientId,
            packageId: selectedPackage.id,
            serviceDate,
            scopeNotes: scopeNotes || undefined,
          }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Failed to create booking");
        currentBookingId = json.data.id as string;
        setBookingId(currentBookingId);
        setCreatedFor(detailsKey);
      }

      const payRes = await fetch("/api/bookings/" + currentBookingId + "/pay", {
        method: "POST",
      });
      const payJson = await payRes.json().catch(() => null);
      if (!payJson?.success) throw new Error(payJson?.error ?? "Failed to start payment");

      // Wallet path — funds moved server-side synchronously; nothing to verify.
      if (payJson.data?.method === "WALLET") {
        setStep("confirmation");
        return;
      }

      const { accessCode, reference, authorizationUrl } = (payJson.data ?? {}) as {
        accessCode?: string;
        reference?: string;
        authorizationUrl?: string;
      };
      if (!accessCode && !authorizationUrl) {
        throw new Error("Payment could not be started — please try again");
      }

      // Server-side verify before ANY confirmation is shown — the popup callback
      // and our own 200 are not proof that money moved ("Payment Truthfulness").
      interface VerifyOutcome {
        done: boolean;
        retry: boolean;
        message?: string;
      }
      const checkVerify = async (ref: string): Promise<VerifyOutcome> => {
        const verifyRes = await fetch(
          `/api/bookings/${currentBookingId}/pay/verify?reference=${encodeURIComponent(ref)}`,
        );
        const v = await verifyRes.json().catch(() => null);
        if (v?.success && v?.data?.verified) return { done: true, retry: false };

        if (v?.success) {
          const status = v.data?.status as string | undefined;
          if (status === "pending") return { done: false, retry: true };
          if (status === "failed") {
            return { done: false, retry: false, message: "Payment failed — you haven't been charged. Please try again." };
          }
          return { done: false, retry: false, message: "Payment was not completed — you haven't been charged. You can try again." };
        }

        const error = (v?.error as string | undefined) ?? "";
        // Transient processor/network errors are worth retrying; ownership,
        // mismatch and validation failures are definitive.
        if (verifyRes.status >= 500 || /could not verify/i.test(error)) {
          return { done: false, retry: true, message: error || undefined };
        }
        return { done: false, retry: false, message: error || "Payment could not be verified — check your Bookings page or try again." };
      };

      interface PaystackPopInstance {
        resume: (code: string) => void;
        on: (event: string, cb: (resp?: { reference?: string }) => void) => void;
      }
      const PaystackPop = (window as unknown as Record<string, unknown>).PaystackPop as unknown as
        | (new () => PaystackPopInstance)
        | undefined;

      if (PaystackPop && accessCode) {
        const release = () => setIsSubmitting(false);
        const handler = new PaystackPop();
        // Handlers registered BEFORE resume so a fast success can't be missed.
        handler.on("success", (resp) => {
          void (async () => {
            try {
              const outcome = await checkVerify(resp?.reference ?? reference ?? "");
              if (outcome.done) {
                setStep("confirmation");
              } else {
                toast(outcome.message ?? "Payment could not be verified — check your Bookings page or try again.", "error");
              }
            } catch {
              toast("Payment could not be verified — check your Bookings page or try again.", "error");
            } finally {
              release();
            }
          })();
        });
        handler.on("cancel", () => {
          toast("Payment cancelled — you can try again whenever you're ready.", "info");
          release();
        });
        handler.on("error", () => {
          toast("Something went wrong with the payment. Please try again.", "error");
          release();
        });
        handler.resume(accessCode);
        keepLoading = true; // only once the popup is genuinely in flight
        return; // released by the handlers above
      }

      if (authorizationUrl && reference) {
        // No popup library — open the hosted checkout in a NEW tab so the drawer
        // and entered details stay intact, then poll until Paystack settles it
        // (the webhook finalizes server-side regardless).
        const opened = window.open(authorizationUrl, "_blank", "noopener,noreferrer");
        if (!opened) {
          // Pop-up blocked — last resort: full-page redirect (callback_url lands
          // on /bookings where status is rendered server-side).
          window.location.assign(authorizationUrl);
          return;
        }

        const MAX_ATTEMPTS = 30;
        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, 4000));
          const outcome = await checkVerify(reference);
          if (outcome.done) {
            setStep("confirmation");
            return;
          }
          if (!outcome.retry) {
            toast(outcome.message ?? "Payment was not completed — you can try again.", "info");
            return;
          }
        }
        toast(
          "We couldn't confirm the payment yet. It completes automatically once confirmed — check your Bookings page in a few minutes.",
          "info",
        );
        return;
      }

      throw new Error("Payment could not be started — please try again");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Something went wrong — please try again",
        "error",
      );
    } finally {
      if (!keepLoading) setIsSubmitting(false);
    }
  }, [serviceDate, scopeNotes, provider.id, clientId, selectedPackage.id, bookingId, createdFor, isSubmitting, toast]);

  const minDate = new Date().toISOString().split("T")[0];

  return (
    <>
      <ClSheet
        open={open}
        onClose={handleClose}
        side="right"
        className="max-[640px]:!max-h-[90vh] max-[640px]:!rounded-t-[20px] max-[640px]:!h-auto"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-[family-name:var(--font-display)] font-bold text-[18px] text-[var(--color-text-primary)]">
              {step === "details" && "Book " + provider.displayName}
              {step === "payment" && "Complete Payment"}
              {step === "confirmation" && "Booking Confirmed"}
            </h2>
            <button
              onClick={handleClose}
              aria-label="Close booking drawer"
              className="w-8 h-8 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-secondary)] cursor-pointer"
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {step === "details" && (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4 mb-5">
                  <h3 className="font-medium text-[14px] text-[var(--color-text-primary)]">
                    {selectedPackage.label}
                  </h3>
                  <p className="text-[12px] text-[var(--color-text-secondary)] mt-1">
                    {selectedPackage.tier} ·{" "}
                    {selectedPackage.turnaroundDays} day delivery
                  </p>
                  <div className="mt-3 flex flex-col gap-1.5">
                    {(selectedPackage.deliverables as string[]).map(
                      (item, i) => (
                        <span
                          key={i}
                          className="text-[13px] text-[var(--color-text-secondary)] flex items-center gap-2"
                        >
                          <Check size={12} strokeWidth={2.5} color="var(--color-accent)" />
                          {item}
                        </span>
                      ),
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-[13px] font-medium text-[var(--color-text-secondary)] mb-1.5 block">
                    Service Date
                  </label>
                  <input
                    type="date"
                    value={serviceDate}
                    onChange={(e) => setServiceDate(e.target.value)}
                    min={minDate}
                    className="w-full rounded-[8px] bg-[var(--color-surface-raised)] p-3 border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
                  />
                </div>

                <div className="mb-5">
                  <label className="text-[13px] font-medium text-[var(--color-text-secondary)] mb-1.5 block">
                    Scope Notes
                    <span className="text-[var(--color-text-tertiary)] ml-1">
                      (optional)
                    </span>
                  </label>
                  <ClTextarea
                    placeholder="Describe what you need..."
                    value={scopeNotes}
                    onChange={(e) => setScopeNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4 mb-5">
                  <h4 className="text-[13px] font-medium text-[var(--color-text-secondary)] mb-3">
                    Price Breakdown
                  </h4>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[13px] text-[var(--color-text-secondary)]">
                      Subtotal
                    </span>
                    <span className="text-[13px] text-[var(--color-text-primary)]">
                      ₦{(subtotal / 100).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[13px] text-[var(--color-text-secondary)]">
                      Service Fee ({(platformConfig.feeRate * 100).toFixed(0)}%)
                    </span>
                    <span className="text-[13px] text-[var(--color-text-tertiary)]">
                      ₦{(feeKobo / 100).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)] mt-2">
                    <span className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                      Total
                    </span>
                    <span className="text-[16px] font-bold text-[var(--color-accent)]">
                      ₦{(totalKobo / 100).toLocaleString()}
                    </span>
                  </div>
                </div>

                <details className="mb-5 group">
                  <summary className="text-[12px] text-[var(--color-text-tertiary)] cursor-pointer list-none flex items-center gap-1 select-none">
                    <ChevronRight size={12} strokeWidth={2} className="transition-transform group-open:rotate-90" />
                    {escrowNotice?.title ?? "How escrow works"}
                  </summary>
                  {escrowNotice?.body && (
                    <p className="text-[12px] text-[var(--color-text-tertiary)] mt-2 leading-relaxed">
                      {escrowNotice.body}
                    </p>
                  )}
                </details>

                <ClButton
                  variant="primary"
                  fullWidth
                  disabled={!serviceDate}
                  loading={isSubmitting}
                  onClick={handleSubmitDetails}
                >
                  Continue to Payment
                </ClButton>
              </motion.div>
            )}

            {step === "payment" && (
              <motion.div
                key="payment"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div
                  ref={paystackRef}
                  id="paystack-inline-container"
                  className="min-h-[200px]"
                />
              </motion.div>
            )}

            {step === "confirmation" && (
              <motion.div
                key="confirmation"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="text-center py-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 200,
                    damping: 15,
                    delay: 0.1,
                  }}
                  className="w-16 h-16 rounded-full bg-[rgba(74,222,128,0.15)] flex items-center justify-center mx-auto mb-4"
                >
                  <Check size={28} strokeWidth={2.5} color="var(--color-success)" />
                </motion.div>

                <h3 className="font-[family-name:var(--font-display)] font-bold text-[20px] text-[var(--color-text-primary)] mb-2">
                  Booking Confirmed!
                </h3>

                {bookingId && (
                  <p className="text-[13px] text-[var(--color-text-secondary)] font-mono mb-5">
                    Ref: {bookingId.split("-").slice(-2).join("").toUpperCase().slice(0, 8)}
                  </p>
                )}

                <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4 text-left mb-6">
                  <h4 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)] mb-3">
                    What happens next
                  </h4>
                  <ol className="flex flex-col gap-3">
                    {[
                      `${provider.displayName} will be notified of your booking`,
                      "Payment is held securely in escrow",
                      `${provider.displayName} completes the work by the service date`,
                      "You review and confirm release",
                      "Funds are released to the provider",
                    ].map((text, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 text-[13px] text-[var(--color-text-secondary)]"
                      >
                        <span className="w-5 h-5 rounded-full bg-[var(--color-accent-muted)] text-[var(--color-accent)] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {text}
                      </li>
                    ))}
                  </ol>
                </div>

                <ClButton
                  variant="outlined"
                  fullWidth
                  onClick={() => {
                    onClose();
                    setStep("details");
                    setServiceDate("");
                    setScopeNotes("");
                  }}
                >
                  Done
                </ClButton>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ClSheet>

      <ClDialog open={showExitDialog} onClose={() => setShowExitDialog(false)}>
        <div className="text-center">
          <h3 className="font-[family-name:var(--font-display)] font-bold text-[16px] text-[var(--color-text-primary)] mb-2">
            Cancel Booking?
          </h3>
          <p className="text-[13px] text-[var(--color-text-secondary)] mb-6">
            Your progress will be lost. Are you sure you want to exit?
          </p>
          <div className="flex gap-3">
            <ClButton
              variant="ghost"
              fullWidth
              onClick={() => setShowExitDialog(false)}
            >
              Keep Going
            </ClButton>
            <ClButton
              variant="outlined"
              fullWidth
              onClick={handleConfirmExit}
            >
              Yes, Exit
            </ClButton>
          </div>
        </div>
      </ClDialog>
    </>
  );
}
