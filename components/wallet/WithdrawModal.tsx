"use client";

import { useState, useCallback } from "react";
import { ClModal, ClButton } from "@/components/ui";
import { useToast } from "@/lib/toast";

interface WithdrawModalProps {
  open: boolean;
  onClose: () => void;
  balanceKobo: number;
  onSuccess?: () => void;
}

export function WithdrawModal({ open, onClose, balanceKobo, onSuccess }: WithdrawModalProps) {
  const [amount, setAmount] = useState("");
  const [recipientCode, setRecipientCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const amountKobo = parseInt(amount, 10) * 100;
  const isValid = amountKobo > 0 && amountKobo <= balanceKobo && recipientCode;

  const handleWithdraw = useCallback(async () => {
    if (!isValid) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountKobo, bankRecipientCode: recipientCode }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Withdrawal failed");

      toast("Withdrawal requested. Funds typically arrive within 24 hours.", "success");
      onSuccess?.();
      onClose();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Withdrawal failed. Please try again.",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  }, [amountKobo, recipientCode, isValid, onSuccess, onClose, toast]);

  return (
    <ClModal
      open={open}
      onClose={onClose}
      title="Withdraw Funds"
      description={`Available balance: ₦${(balanceKobo / 100).toLocaleString()}`}
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
        placeholder={`Max: ₦${(balanceKobo / 100).toLocaleString()}`}
        className="w-full rounded-[8px] bg-[var(--color-surface-raised)] p-3 border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] mb-4"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      />

      {amountKobo > balanceKobo && (
        <p className="text-[12px] text-red-500 mb-4">
          Amount exceeds available balance
        </p>
      )}

      <label className="text-[13px] font-medium text-[var(--color-text-secondary)] mb-1.5 block">
        Bank Recipient Code
      </label>
      <input
        type="text"
        value={recipientCode}
        onChange={(e) => setRecipientCode(e.target.value)}
        placeholder="Enter Paystack recipient code"
        className="w-full rounded-[8px] bg-[var(--color-surface-raised)] p-3 border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] mb-4"
      />

      <ClButton
        variant="primary"
        fullWidth
        disabled={!isValid}
        loading={isLoading}
        onClick={handleWithdraw}
      >
        Withdraw
      </ClButton>

      <p className="text-[12px] text-[var(--color-text-secondary)] mt-3 text-center">
        Withdrawals typically arrive within 24 hours.
      </p>
    </ClModal>
  );
}