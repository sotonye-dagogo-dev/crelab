"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ClDialog, ClButton, ClTextarea } from "@/components/ui";

interface DisputeModalProps {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  clientId: string;
}

export function DisputeModal({
  open,
  onClose,
  bookingId,
  clientId,
}: DisputeModalProps) {
  const [reason, setReason] = useState("");
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = useCallback(async () => {
    if (!reason.trim()) {
      setError("Please provide a reason for the dispute");
      return;
    }
    setStep("confirm");
  }, [reason]);

  const handleConfirm = useCallback(async () => {
    setIsSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/bookings/${bookingId}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, clientId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to raise dispute");
      onClose();
      setStep("form");
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("form");
    } finally {
      setIsSubmitting(false);
    }
  }, [reason, bookingId, clientId, onClose]);

  const handleClose = useCallback(() => {
    setStep("form");
    setReason("");
    setError("");
    onClose();
  }, [onClose]);

  return (
    <ClDialog open={open} onClose={handleClose}>
      <AnimatePresence mode="wait">
        {step === "form" ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <h3 className="font-[family-name:var(--font-display)] font-bold text-[16px] text-[var(--color-text-primary)] mb-1">
              Raise a Dispute
            </h3>
            <p className="text-[13px] text-[var(--color-text-secondary)] mb-4">
              Describe the issue with this booking
            </p>

            <ClTextarea
              placeholder="Explain what went wrong..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError("");
              }}
              rows={4}
              error={error}
            />

            <div className="flex gap-3 mt-5">
              <ClButton variant="ghost" fullWidth onClick={handleClose}>
                Cancel
              </ClButton>
              <ClButton
                variant="primary"
                fullWidth
                onClick={handleSubmit}
                disabled={!reason.trim()}
              >
                Submit Dispute
              </ClButton>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="text-center"
          >
            <div className="w-12 h-12 rounded-full bg-[rgba(248,113,113,0.15)] flex items-center justify-center mx-auto mb-4">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-escrow-disputed)"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
            </div>

            <h3 className="font-[family-name:var(--font-display)] font-bold text-[16px] text-[var(--color-text-primary)] mb-2">
              Submit Dispute?
            </h3>
            <p className="text-[13px] text-[var(--color-text-secondary)] mb-6">
              An admin will review your case. This action cannot be undone.
            </p>

            {error && (
              <p className="text-[12px] text-[var(--color-error)] mb-4">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <ClButton
                variant="ghost"
                fullWidth
                onClick={() => setStep("form")}
              >
                Back
              </ClButton>
              <ClButton
                variant="primary"
                fullWidth
                loading={isSubmitting}
                onClick={handleConfirm}
              >
                Yes, Submit
              </ClButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ClDialog>
  );
}
