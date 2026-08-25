"use client";

import { useState, useCallback } from "react";
import { ClModal, ClButton } from "@/components/ui";
import { useToast } from "@/lib/toast";
import { Lock, Building2, CreditCard } from "lucide-react";

interface TopUpModalProps {
  open: boolean;
  onClose: () => void;
}

export function TopUpModal({ open, onClose }: TopUpModalProps) {
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [method, setMethod] = useState<"card" | "bank">("card");
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
      // /wallet/payment-status which verifies the transaction and reflects it.
      window.location.href = json.data.authorizationUrl;
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Could not start payment. Please try again.",
        "error",
      );
      setIsLoading(false);
    }
  }, [amount, toast]);

  const handleBankTopUp = useCallback(async () => {
    const amountKobo = parseInt(amount, 10) * 100;
    if (!amountKobo || amountKobo <= 0) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/wallet/topup/bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Could not generate bank account details");

      // Show the bank account details in a toast/modal
      toast(
        `Bank transfer details generated! Account: ${json.data.accountNumber} (${json.data.bankName}). Transfer ₦${(amountKobo / 100).toLocaleString()} to top up your wallet.`,
        "success",
      );
      setIsLoading(false);
      onClose();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Could not generate bank account details. Please try again.",
        "error",
      );
      setIsLoading(false);
    }
  }, [amount, toast, onClose]);

  return (
    <ClModal
      open={open}
      onClose={onClose}
      title="Top Up Wallet"
      description="Fund your Crellab wallet with a card payment or bank transfer."
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

      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setMethod("card")}
          className={`flex-1 h-10 rounded-[8px] font-semibold text-[13px] transition-colors flex items-center justify-center gap-2 ${
            method === "card"
              ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)]"
              : "bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)]"
          }`}
        >
          <CreditCard size={15} strokeWidth={1.8} />
          Card
        </button>
        <button
          type="button"
          onClick={() => setMethod("bank")}
          className={`flex-1 h-10 rounded-[8px] font-semibold text-[13px] transition-colors flex items-center justify-center gap-2 ${
            method === "bank"
              ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)]"
              : "bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)]"
          }`}
        >
          <Building2 size={15} strokeWidth={1.8} />
          Bank Transfer
        </button>
      </div>

      {method === "card" ? (
        <>
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
        </>
      ) : (
        <>
          <ClButton
            variant="primary"
            fullWidth
            disabled={!amount || parseInt(amount) <= 0}
            loading={isLoading}
            onClick={handleBankTopUp}
          >
            Generate Bank Account Details
          </ClButton>

          <p className="text-[11px] text-[var(--color-text-tertiary)] mt-4 text-center">
            You will receive a unique virtual account number to transfer funds to.
            Your wallet will be credited automatically once the transfer is received.
          </p>
        </>
      )}
    </ClModal>
  );
}