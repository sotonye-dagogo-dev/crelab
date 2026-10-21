"use client";

import { useState, useCallback } from "react";
import { ClModal, ClButton } from "@/components/ui";
import { useToast } from "@/lib/toast";
import { usePlatformConfig } from "@/lib/config-context";
import { resolvePaymentNotice } from "@/lib/payment-notices";
import { isValidRecipientCode, RECIPIENT_CODE_HINT } from "@/lib/wallet-recipients";
import { normalizePaymentProviders } from "@/lib/payments/config";
import { PaymentNoticeBlock } from "@/components/shared/PaymentNoticeBlock";

interface WithdrawModalProps {
  open: boolean;
  onClose: () => void;
  balanceKobo: number;
  onSuccess?: () => void;
}

/** Paystack transfer recipient codes are `RCP_` + alphanumerics (see lib/wallet-recipients). */

export function WithdrawModal({ open, onClose, balanceKobo, onSuccess }: WithdrawModalProps) {
  const [amount, setAmount] = useState("");
  const [recipientCode, setRecipientCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountName, setAccountName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const platformConfig = usePlatformConfig();

  const providers = normalizePaymentProviders(platformConfig.payments?.provider);
  const selectedProviderId =
    (providers.active === "PAYSTACK" ? providers.providers.paystack : providers.providers.monnify).enabled
      ? providers.active
      : (providers.fallback === "PAYSTACK" ? providers.providers.paystack : providers.providers.monnify).enabled
        ? providers.fallback
        : providers.active;
  const needsBankAccount = selectedProviderId === "MONNIFY";

  const amountKobo = parseInt(amount, 10) * 100;
  const trimmedCode = recipientCode.trim();
  const codeLooksValid = isValidRecipientCode(trimmedCode);
  const bankAccountValid =
    accountNumber.trim().length === 10 &&
    bankCode.trim().length > 0 &&
    accountName.trim().length > 0;
  // A bank account is always accepted (Paystack creates the recipient on the
  // fly); the legacy recipient-code shortcut remains for Paystack users. This
  // also keeps withdrawals working when the server falls back to Monnify
  // because the active Paystack credentials are missing.
  const destinationValid = needsBankAccount ? bankAccountValid : codeLooksValid || bankAccountValid;
  const isValid = amountKobo > 0 && amountKobo <= balanceKobo && destinationValid;
  const payoutNotice = resolvePaymentNotice(platformConfig, "payoutDetails");
  const feeNotice = resolvePaymentNotice(platformConfig, "processingFees");

  const handleWithdraw = useCallback(async () => {
    if (!isValid) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          bankAccountValid
            ? {
                amountKobo,
                bankAccount: {
                  accountNumber: accountNumber.trim(),
                  bankCode: bankCode.trim(),
                  accountName: accountName.trim(),
                },
              }
            : { amountKobo, bankRecipientCode: trimmedCode },
        ),
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
  }, [
    amountKobo,
    trimmedCode,
    bankAccountValid,
    accountNumber,
    bankCode,
    accountName,
    isValid,
    onSuccess,
    onClose,
    toast,
  ]);

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

      {needsBankAccount ? (
        <>
          <label className="text-[13px] font-medium text-[var(--color-text-secondary)] mb-1.5 block">
            Account Number
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="10-digit NUBAN account number"
            className="w-full rounded-[8px] bg-[var(--color-surface-raised)] p-3 border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] mb-4"
          />

          <label className="text-[13px] font-medium text-[var(--color-text-secondary)] mb-1.5 block">
            Bank Code
          </label>
          <input
            type="text"
            value={bankCode}
            onChange={(e) => setBankCode(e.target.value.trim())}
            placeholder="e.g. 058"
            className="w-full rounded-[8px] bg-[var(--color-surface-raised)] p-3 border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] mb-4"
          />

          <label className="text-[13px] font-medium text-[var(--color-text-secondary)] mb-1.5 block">
            Account Name
          </label>
          <input
            type="text"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="Name on the receiving account"
            className="w-full rounded-[8px] bg-[var(--color-surface-raised)] p-3 border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] mb-4"
          />
        </>
      ) : (
        <>
          <label className="text-[13px] font-medium text-[var(--color-text-secondary)] mb-1.5 block">
            Bank Recipient Code
          </label>
          <input
            type="text"
            value={recipientCode}
            onChange={(e) => setRecipientCode(e.target.value)}
            placeholder="Enter payout recipient code (RCP_…)"
            aria-invalid={trimmedCode.length > 0 && !codeLooksValid}
            className="w-full rounded-[8px] bg-[var(--color-surface-raised)] p-3 border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] mb-4"
          />

          {trimmedCode.length > 0 && !codeLooksValid && (
            <p className="text-[12px] text-red-500 mb-4">
              {RECIPIENT_CODE_HINT}
            </p>
          )}

          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)] mb-3">
            Or pay to a bank account
          </p>
          <label className="text-[13px] font-medium text-[var(--color-text-secondary)] mb-1.5 block">
            Account Number
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="10-digit NUBAN account number"
            className="w-full rounded-[8px] bg-[var(--color-surface-raised)] p-3 border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] mb-4"
          />
          <label className="text-[13px] font-medium text-[var(--color-text-secondary)] mb-1.5 block">
            Bank Code
          </label>
          <input
            type="text"
            value={bankCode}
            onChange={(e) => setBankCode(e.target.value.trim())}
            placeholder="e.g. 058"
            className="w-full rounded-[8px] bg-[var(--color-surface-raised)] p-3 border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] mb-4"
          />
          <label className="text-[13px] font-medium text-[var(--color-text-secondary)] mb-1.5 block">
            Account Name
          </label>
          <input
            type="text"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="Name on the receiving account"
            className="w-full rounded-[8px] bg-[var(--color-surface-raised)] p-3 border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] mb-4"
          />
        </>
      )}

      <PaymentNoticeBlock notice={payoutNotice} tone="warning" className="mb-4" />

      <ClButton
        variant="primary"
        fullWidth
        disabled={!isValid}
        loading={isLoading}
        onClick={handleWithdraw}
      >
        Withdraw
      </ClButton>

      <PaymentNoticeBlock notice={feeNotice} className="mt-3" />

      <p className="text-[12px] text-[var(--color-text-secondary)] mt-3 text-center">
        Withdrawals typically arrive within 24 hours.
      </p>
    </ClModal>
  );
}