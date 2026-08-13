"use client";

import { useState, useCallback, useEffect } from "react";
import { WalletBalanceCard } from "@/components/wallet/WalletBalanceCard";
import { TopUpModal } from "@/components/wallet/TopUpModal";
import { WithdrawModal } from "@/components/wallet/WithdrawModal";
import { ClButton, ClBackButton } from "@/components/ui";
import type { IWalletTransaction, WalletTransactionType } from "@/types";
import { ArrowUpRight, ArrowDownLeft } from "lucide-react";

interface WalletClientProps {
  balanceKobo: number;
  escrowKobo: number;
  totalEarnedKobo: number;
  isProvider: boolean;
}

const typeLabels: Partial<Record<WalletTransactionType, string>> = {
  TOPUP_CARD: "Card Top-Up",
  TOPUP_BANK: "Bank Transfer Top-Up",
  BOOKING_DEBIT: "Booking Payment",
  ESCROW_RELEASE: "Escrow Release",
  MILESTONE_DEBIT: "Milestone Funding",
  MILESTONE_RELEASE: "Milestone Release",
  DIRECT_PAYMENT_DEBIT: "Direct Payment",
  DIRECT_PAYMENT_CREDIT: "Direct Payment Received",
  WITHDRAWAL: "Withdrawal",
  FEE_DEBIT: "Platform Fee",
  REFUND: "Refund",
};

export function WalletClient({
  balanceKobo,
  escrowKobo,
  totalEarnedKobo,
  isProvider,
}: WalletClientProps) {
  const [showTopUp, setShowTopUp] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [transactions, setTransactions] = useState<IWalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("");

  const fetchTransactions = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (!reset && cursor) params.set("cursor", cursor);
      params.set("limit", "20");
      if (typeFilter) params.set("type", typeFilter);

      const res = await fetch(`/api/wallet/transactions?${params}`);
      const json = await res.json();
      if (json.success) {
        setTransactions((prev) => (reset ? json.data : [...prev, ...json.data]));
        setCursor(json.cursor);
        setHasMore(json.hasMore);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [cursor, typeFilter]);

  useEffect(() => {
    fetchTransactions(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter]);

  return (
    <div>
      <ClBackButton href="/dashboard" label="Back to dashboard" className="mb-5" />
      <WalletBalanceCard
        balanceKobo={balanceKobo}
        escrowKobo={escrowKobo}
        totalEarnedKobo={isProvider ? totalEarnedKobo : undefined}
        isProvider={isProvider}
        onTopUp={() => setShowTopUp(true)}
        onWithdraw={isProvider ? () => setShowWithdraw(true) : undefined}
      />

      <div className="mt-8">
        <h2 className="font-[family-name:var(--font-display)] font-bold text-[18px] text-[var(--color-text-primary)] mb-4">
          Transaction History
        </h2>

        <div className="flex gap-2 mb-4 overflow-x-auto">
          {["", "TOPUP_CARD", "TOPUP_BANK", "WITHDRAWAL", "ESCROW_RELEASE", "MILESTONE_RELEASE", "DIRECT_PAYMENT_CREDIT", "BOOKING_DEBIT"].map(
            (type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-3 py-1.5 rounded-[8px] text-[12px] font-medium whitespace-nowrap transition-colors cursor-pointer
                  ${typeFilter === type
                    ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)]"
                    : "bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  }`}
              >
                {type ? typeLabels[type as WalletTransactionType] ?? type : "All"}
              </button>
            ),
          )}
        </div>

        {loading && transactions.length === 0 ? (
          <p className="text-[13px] text-[var(--color-text-tertiary)] py-8 text-center">
            Loading transactions...
          </p>
        ) : transactions.length === 0 ? (
          <p className="text-[13px] text-[var(--color-text-tertiary)] py-8 text-center">
            No transactions yet
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {transactions.map((txn) => {
              const isCredit = txn.direction === "CREDIT" || txn.type === "REFUND";

              return (
                <div
                  key={txn.id}
                  className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isCredit
                          ? "bg-[rgba(74,222,128,0.15)]"
                          : "bg-[rgba(239,68,68,0.15)]"
                      }`}
                    >
                      {isCredit ? (
                        <ArrowDownLeft size={14} strokeWidth={2} color="var(--color-success)" />
                      ) : (
                        <ArrowUpRight size={14} strokeWidth={2} color="#ef4444" />
                      )}
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-[var(--color-text-primary)]">
                        {typeLabels[txn.type] ?? txn.type}
                      </p>
                      <p className="text-[11px] text-[var(--color-text-tertiary)]">
                        {new Date(txn.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-[14px] font-semibold ${
                      isCredit ? "text-green-600" : "text-red-500"
                    }`}
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {isCredit ? "+" : "-"}₦{(txn.amountKobo / 100).toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {hasMore && (
          <ClButton
            variant="ghost"
            fullWidth
            loading={loading}
            onClick={() => fetchTransactions()}
            className="mt-4"
          >
            Load More
          </ClButton>
        )}
      </div>

      <TopUpModal open={showTopUp} onClose={() => setShowTopUp(false)} />
      <WithdrawModal
        open={showWithdraw}
        onClose={() => setShowWithdraw(false)}
        balanceKobo={balanceKobo}
      />
    </div>
  );
}
