"use client";

import { useState, useCallback } from "react";
import { ClModal, ClButton } from "@/components/ui";
import { useToast } from "@/lib/toast";
import { Lock } from "lucide-react";

interface TopUpModalProps {
  open: boolean;
  onClose: () => void;
}

export function TopUpModal({ open, onClose }: TopUpModalProps) {
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleCardTopUp = useCallback(async () => {
    const amountKobo = parseInt(amount, 10) * 100;
    if (!amountKobo || amountKobo <= 0) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/wallet/topup/card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountKobo }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Could not start payment");

      // Redirect to Paystack checkout. On completion Paystack returns to
      // /wallet/payment-status which verifies the charge and reflects it.
      window.location.href = json.data.authorizationUrl;
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Could not start payment. Please try again.",
        "error",
      );
      setIsLoading(false);
    }
  }, [amount, toast]);

  return (
    <ClModal
      open={open}
      onClose={onClose}
      title="Top Up Wallet"
      description="Fund your Crellab wallet with a card payment."
      size="sm"
    >
      <label className="text-[13px] font-medium text-[var(--color-text-secondary)] mb-1.5 block">
        Amount (₦)
      </label>
      <input
        type="number"
        min="10"
        step="100"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Enter amount"
        className="w-full rounded-[8px] bg-[var(--color-surface-raised)] p-3 border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] mb-4"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      />
      <ClButton
        variant="primary"
        fullWidth
        disabled={!amount || parseInt(amount) <= 0}
        loading={isLoading}
        onClick={handleCardTopUp}
      >
        Proceed to Paystack
      </ClButton>

      <p className="flex items-center justify-center gap-1.5 text-[11px] text-[var(--color-text-tertiary)] mt-4 text-center">
        <Lock size={11} strokeWidth={2} />
        Secured by Paystack. Your card details are never seen by Crellab.
      </p>
    </ClModal>
  );
}