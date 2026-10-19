"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClButton } from "@/components/ui";
import { useToast } from "@/lib/toast";
import { usePlatformConfig } from "@/lib/config-context";
import { useBookingPayment } from "@/hooks/useBookingPayment";
import { resolvePaymentNotice } from "@/lib/payment-notices";
import { formatKobo } from "@/lib/currency";
import { CreditCard, ShieldCheck, Wallet } from "lucide-react";
import type { IBooking } from "@/types";

interface BookingPayPanelProps {
  booking: IBooking;
  providerName?: string | null;
}

/**
 * "Pay Now" surface for the booking detail page (client + ACCEPTED). Amounts
 * come from the booking row itself — nothing is recomputed client-side, so the
 * charge always matches what the provider accepted. Money movement is the
 * shared `useBookingPayment` hook (server-side verify before any success UI).
 */
export function BookingPayPanel({ booking, providerName }: BookingPayPanelProps) {
  const router = useRouter();
  const { toast } = useToast();
  const platformConfig = usePlatformConfig();
  const { payWithWallet, payWithCard, isPaying, paid } = useBookingPayment();
  const [walletBalanceKobo, setWalletBalanceKobo] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/wallet/balance");
        const json = await res.json().catch(() => null);
        if (!cancelled && json?.success && typeof json.data?.balanceKobo === "number") {
          setWalletBalanceKobo(json.data.balanceKobo);
        }
      } catch {
        // Balance is a convenience — the wallet button still works without it.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (paid) {
      toast("Payment confirmed — your funds are held securely in escrow.", "success");
      router.refresh();
    }
  }, [paid, router, toast]);

  const walletEnabled = platformConfig.wallet?.enabled !== false;
  const walletBalanceLoaded = walletBalanceKobo !== null;
  const walletCanCover = walletBalanceKobo !== null && walletBalanceKobo >= booking.total;
  const escrowNotice = resolvePaymentNotice(platformConfig, "escrowExplainer");

  return (
    <div
      id="pay-panel"
      className="mt-5 rounded-[16px] border border-[var(--color-accent)] bg-[var(--color-surface)] p-5 scroll-mt-24"
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="font-[family-name:var(--font-display)] font-bold text-[16px] text-[var(--color-text-primary)]">
          Complete Payment
        </h3>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent-muted)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-accent)]">
          <ShieldCheck size={12} strokeWidth={2.5} />
          Escrow protected
        </span>
      </div>

      <p className="text-[13px] text-[var(--color-text-secondary)] mb-4">
        {providerName ? `${providerName} has accepted your booking. ` : ""}
        Pay now to confirm the booking and get the work started — funds stay
        protected until you approve delivery.
      </p>

      <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4 mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[13px] text-[var(--color-text-secondary)]">Subtotal</span>
          <span className="text-[13px] text-[var(--color-text-primary)] tabular-nums">
            {formatKobo(booking.subtotal)}
          </span>
        </div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[13px] text-[var(--color-text-secondary)]">Service Fee</span>
          <span className="text-[13px] text-[var(--color-text-tertiary)] tabular-nums">
            {formatKobo(booking.fee)}
          </span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)] mt-2">
          <span className="text-[14px] font-semibold text-[var(--color-text-primary)]">Total</span>
          <span className="text-[16px] font-bold text-[var(--color-accent)] tabular-nums">
            {formatKobo(booking.total)}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:gap-3">
        <ClButton
          variant="primary"
          className="flex-1"
          loading={isPaying}
          onClick={() => void payWithCard(booking.id)}
        >
          <CreditCard size={15} strokeWidth={2} className="mr-2" />
          Pay with Card
        </ClButton>

        {walletEnabled && (
          <ClButton
            variant="outlined"
            className="flex-1"
            loading={isPaying}
            disabled={walletBalanceLoaded && !walletCanCover}
            onClick={() => void payWithWallet(booking.id)}
          >
            <Wallet size={15} strokeWidth={2} className="mr-2" />
            {walletBalanceLoaded
              ? walletCanCover
                ? `Pay from Wallet (${formatKobo(walletBalanceKobo)})`
                : "Wallet balance too low"
              : "Pay from Wallet"}
          </ClButton>
        )}
      </div>

      {walletEnabled && walletBalanceLoaded && !walletCanCover && (
        <p className="mt-2 text-[12px] text-[var(--color-text-tertiary)]">
          Top up your wallet from the Wallet page, or pay by card instead.
        </p>
      )}

      {escrowNotice && (
        <details className="mt-4 group">
          <summary className="text-[12px] text-[var(--color-text-tertiary)] cursor-pointer list-none flex items-center gap-1 select-none">
            {escrowNotice.title}
          </summary>
          <p className="text-[12px] text-[var(--color-text-tertiary)] mt-2 leading-relaxed">
            {escrowNotice.body}
          </p>
        </details>
      )}
    </div>
  );
}
