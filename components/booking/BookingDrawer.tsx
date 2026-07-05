"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ClSheet, ClButton, ClDialog, ClTextarea } from "@/components/ui";
import { usePlatformConfig } from "@/lib/config-context";
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const platformConfig = usePlatformConfig();
  const paystackRef = useRef<HTMLDivElement>(null);

  const subtotal = selectedPackage.price;
  const feeKobo = Math.round(subtotal * platformConfig.feeRate);
  const totalKobo = subtotal + feeKobo;

  const handleClose = useCallback(() => {
    if (step !== "details") {
      setShowExitDialog(true);
    } else {
      onClose();
      setStep("details");
      setServiceDate("");
      setScopeNotes("");
    }
  }, [step, onClose]);

  const handleConfirmExit = useCallback(() => {
    setShowExitDialog(false);
    setStep("details");
    setServiceDate("");
    setScopeNotes("");
    onClose();
  }, [onClose]);

  const handleSubmitDetails = useCallback(async () => {
    if (!serviceDate) return;
    setIsSubmitting(true);
    try {
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

      setBookingId(json.data.id);

      const payRes = await fetch("/api/bookings/" + json.data.id + "/pay", {
        method: "POST",
      });
      const payJson = await payRes.json();
      if (!payJson.success) throw new Error(payJson.error ?? "Failed to init payment");

      if (typeof window !== "undefined" && (window as any).PaystackPop) {
        const handler = new (window as any).PaystackPop();
        handler.resume(payJson.data.accessCode);
        handler.on("success", () => {
          setStep("confirmation");
        });
      } else {
        setStep("confirmation");
      }
    } catch (err) {
      console.error("Booking error:", err);
    } finally {
      setIsSubmitting(false);
    }
  }, [serviceDate, scopeNotes, provider.id, clientId, selectedPackage.id]);

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
              className="w-8 h-8 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-secondary)] cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
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
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="var(--color-accent)"
                            strokeWidth="2.5"
                          >
                            <polyline points="20,6 9,17 4,12" />
                          </svg>
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
                    <svg
                      className="w-3 h-3 transition-transform group-open:rotate-90"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                    How escrow works
                  </summary>
                  <p className="text-[12px] text-[var(--color-text-tertiary)] mt-2 leading-relaxed">
                    Your payment is held securely by Paystack until you confirm
                    the work is complete. {provider.displayName} only receives
                    the funds after your approval.
                  </p>
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
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--color-success)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20,6 9,17 4,12" />
                  </svg>
                </motion.div>

                <h3 className="font-[family-name:var(--font-display)] font-bold text-[20px] text-[var(--color-text-primary)] mb-2">
                  Booking Confirmed!
                </h3>

                {bookingId && (
                  <p className="text-[13px] text-[var(--color-text-secondary)] font-mono mb-5">
                    Booking ID: {bookingId.slice(0, 8).toUpperCase()}
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
