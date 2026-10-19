"use client";

import { ClButton, ClInfoTip } from "@/components/ui";
import { usePlatformConfig } from "@/lib/config-context";
import { resolveHint } from "@/lib/hints";

interface WalletBalanceCardProps {
  balanceKobo: number;
  escrowKobo: number;
  totalEarnedKobo?: number;
  isProvider?: boolean;
  onTopUp: () => void;
  onWithdraw?: () => void;
}

export function WalletBalanceCard({
  balanceKobo,
  escrowKobo,
  totalEarnedKobo,
  isProvider = false,
  onTopUp,
  onWithdraw,
}: WalletBalanceCardProps) {
  const platformConfig = usePlatformConfig();
  const balanceHint = resolveHint("walletBalance", platformConfig);
  const withdrawHint = resolveHint("walletWithdraw", platformConfig);

  return (
    <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-6">
      <p className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)] mb-1">
        Available Balance
        {balanceHint && (
          <ClInfoTip label="About your wallet balance">
            {balanceHint}
          </ClInfoTip>
        )}
      </p>
      <p
        className="font-[family-name:var(--font-display)] font-extrabold text-[32px] leading-tight text-[var(--color-accent)]"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        ₦{(balanceKobo / 100).toLocaleString()}
      </p>

      <div className="flex gap-4 mt-4">
        <p className="text-[12px] text-[var(--color-text-secondary)]">
          In escrow:{" "}
          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            ₦{(escrowKobo / 100).toLocaleString()}
          </span>
        </p>
        {isProvider && totalEarnedKobo !== undefined && (
          <p className="text-[12px] text-[var(--color-text-secondary)]">
            Total earned:{" "}
            <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              ₦{(totalEarnedKobo / 100).toLocaleString()}
            </span>
          </p>
        )}
      </div>

      <div className="flex gap-3 mt-6 items-center">
        <ClButton variant="primary" onClick={onTopUp}>
          Top Up
        </ClButton>
        {isProvider && onWithdraw && (
          <span className="inline-flex items-center gap-1.5">
            <ClButton variant="outlined" onClick={onWithdraw}>
              Withdraw
            </ClButton>
            {withdrawHint && (
              <ClInfoTip label="About withdrawals">
                {withdrawHint}
              </ClInfoTip>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
