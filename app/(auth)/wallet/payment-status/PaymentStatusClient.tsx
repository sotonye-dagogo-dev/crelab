"use client";

import { useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ClBackButton } from "@/components/ui";
import { Check, XCircle, Loader2, AlertTriangle } from "lucide-react";

function WalletLink({
  href,
  variant = "primary",
  children,
}: {
  href: string;
  variant?: "primary" | "outlined";
  children: React.ReactNode;
}) {
  const base =
    "inline-flex h-10 w-full items-center justify-center gap-2 rounded-[8px] px-4 text-[14px] font-semibold no-underline transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]";
  const styles =
    variant === "primary"
      ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)] hover:bg-[var(--color-accent-dim)]"
      : "bg-transparent border border-[var(--color-border-mid)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]";
  return (
    <Link href={href} className={`${base} ${styles}`}>
      {children}
    </Link>
  );
}

interface VerifyResult {
  status: string;
  amountKobo: number;
  credited: boolean;
}

type Phase = "loading" | "success" | "not-paid" | "error";

export function PaymentStatusClient({ reference }: { reference: string | null }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [result, setResult] = useState<VerifyResult | null>(null);

  const verify = useCallback(async () => {
    if (!reference) {
      setPhase("error");
      return;
    }
    try {
      const res = await fetch(`/api/wallet/topup/verify?reference=${encodeURIComponent(reference)}`);
      const json = await res.json();
      if (!json.success) {
        setPhase("error");
        return;
      }
      setResult(json.data);
      if (json.data.status === "success") {
        setPhase("success");
        // Redirect to wallet with success status
        router.replace(`/wallet?topup=success&amount=${json.data.amountKobo}`);
      } else {
        setPhase("not-paid");
        router.replace(`/wallet?topup=failed`);
      }
    } catch {
      setPhase("error");
      router.replace(`/wallet?topup=failed`);
    }
  }, [reference, router]);

  useEffect(() => {
    verify();
  }, [verify]);

  return (
    <div className="max-w-[520px] mx-auto p-6">
      <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-8 text-center">
        {phase === "loading" && (
          <>
            <div className="w-14 h-14 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-center mx-auto mb-4">
              <Loader2 size={24} strokeWidth={2} className="animate-spin text-[var(--color-accent)]" />
            </div>
            <h1 className="font-[family-name:var(--font-display)] font-bold text-[18px] text-[var(--color-text-primary)] mb-2">
              Confirming payment
            </h1>
            <p className="text-[13px] text-[var(--color-text-secondary)]">
              Verifying your transaction with Paystack…
            </p>
          </>
        )}

        {phase === "success" && (
          <>
            <div className="w-14 h-14 rounded-full bg-[rgba(74,222,128,0.15)] flex items-center justify-center mx-auto mb-4">
              <Check size={28} strokeWidth={2.5} color="var(--color-success)" />
            </div>
            <h1 className="font-[family-name:var(--font-display)] font-bold text-[18px] text-[var(--color-text-primary)] mb-2">
              Payment Successful
            </h1>
            <p className="text-[13px] text-[var(--color-text-secondary)] mb-4">
              Your wallet has been topped up by
            </p>
            <p
              className="text-[28px] font-extrabold text-[var(--color-accent)] mb-6"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              ₦{((result?.amountKobo ?? 0) / 100).toLocaleString()}
            </p>
            <WalletLink href="/wallet">
              Back to Wallet
            </WalletLink>
          </>
        )}

        {phase === "not-paid" && (
          <>
            <div className="w-14 h-14 rounded-full bg-[rgba(250,204,21,0.15)] flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={26} strokeWidth={2} color="var(--color-warning, #facc15)" />
            </div>
            <h1 className="font-[family-name:var(--font-display)] font-bold text-[18px] text-[var(--color-text-primary)] mb-2">
              Payment Not Completed
            </h1>
            <p className="text-[13px] text-[var(--color-text-secondary)] mb-6">
              We couldn&apos;t confirm a successful payment for this transaction.
              Your wallet balance is unchanged. If funds were debited, they will
              be credited automatically once Paystack confirms the charge.
            </p>
            <WalletLink href="/wallet" variant="outlined">
              Back to Wallet
            </WalletLink>
          </>
        )}

        {phase === "error" && (
          <>
            <div className="w-14 h-14 rounded-full bg-[rgba(239,68,68,0.15)] flex items-center justify-center mx-auto mb-4">
              <XCircle size={26} strokeWidth={2} color="#ef4444" />
            </div>
            <h1 className="font-[family-name:var(--font-display)] font-bold text-[18px] text-[var(--color-text-primary)] mb-2">
              Something went wrong
            </h1>
            <p className="text-[13px] text-[var(--color-text-secondary)] mb-6">
              We couldn&apos;t verify your transaction right now. Head back to the
              wallet — your balance will update as soon as Paystack confirms the
              charge.
            </p>
            <WalletLink href="/wallet">
              Back to Wallet
            </WalletLink>
          </>
        )}

        <div className="mt-6 flex justify-center">
          <Link
            href="/dashboard"
            className="text-[13px] text-[var(--color-text-tertiary)] no-underline transition-colors hover:text-[var(--color-text-primary)]"
          >
            Go to dashboard
          </Link>
        </div>
      </div>

      <div className="mt-6 flex justify-start">
        <ClBackButton href="/wallet" label="Back to Wallet" />
      </div>
    </div>
  );
}