"use client";

import { AlertTriangle, FlaskConical, Info, RefreshCw } from "lucide-react";
import { usePlatformConfig } from "@/lib/config-context";
import { usePaymentStatus } from "@/hooks/usePaymentStatus";
import {
  resolvePaymentStatusCopy,
  type PaymentStatusCopyKey,
} from "@/lib/payments/status";

interface PaymentStatusNoticeProps {
  className?: string;
  /** Compact layout for modals/cards. */
  compact?: boolean;
  /** Hide the fallback-partner notice on surfaces where it adds noise. */
  showFallback?: boolean;
  /** Offer a retry action when the rail is currently unavailable. */
  allowRetry?: boolean;
}

type Tone = "danger" | "warning" | "info";

const TONE_STYLES: Record<Tone, { border: string; bg: string; icon: string; Icon: typeof Info }> = {
  danger: {
    border: "rgba(239,68,68,0.35)",
    bg: "rgba(239,68,68,0.08)",
    icon: "#ef4444",
    Icon: AlertTriangle,
  },
  warning: {
    border: "rgba(250,204,21,0.35)",
    bg: "rgba(250,204,21,0.08)",
    icon: "var(--color-warning, #facc15)",
    Icon: FlaskConical,
  },
  info: {
    border: "var(--color-border)",
    bg: "var(--color-surface-raised)",
    icon: "var(--color-accent)",
    Icon: Info,
  },
};

/**
 * User-facing payment-rail awareness: no usable provider, test/sandbox mode, or
 * a fallback partner handling the checkout. Copy is admin-editable under
 * `payments.status`; provider names are never shown on public surfaces.
 */
export function PaymentStatusNotice({
  className,
  compact = false,
  showFallback = true,
  allowRetry = false,
}: PaymentStatusNoticeProps) {
  const config = usePlatformConfig();
  const { status, refresh } = usePaymentStatus();

  if (!status) return null;

  let key: PaymentStatusCopyKey | null = null;
  let tone: Tone = "info";
  if (!status.available) {
    key = "unavailable";
    tone = "danger";
  } else if (status.testMode) {
    key = "userTestMode";
    tone = "warning";
  } else if (status.fallbackUsed && showFallback) {
    key = "userFallback";
    tone = "info";
  }

  if (!key) return null;
  const copy = resolvePaymentStatusCopy(config, key);
  if (!copy.enabled || (!copy.title && !copy.body)) return null;

  const { Icon, border, bg, icon } = TONE_STYLES[tone];

  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={`rounded-[12px] border ${compact ? "p-3" : "p-4"} ${className ?? ""}`}
      style={{ borderColor: border, backgroundColor: bg }}
    >
      <div className="flex items-start gap-2.5">
        <Icon
          size={compact ? 14 : 16}
          strokeWidth={2}
          aria-hidden="true"
          className="shrink-0 mt-0.5"
          style={{ color: icon }}
        />
        <div className="min-w-0 flex-1">
          {copy.title && (
            <div className="text-[12px] font-semibold text-[var(--color-text-primary)] mb-0.5 break-words">
              {copy.title}
            </div>
          )}
          {copy.body && (
            <p className="text-[12px] leading-relaxed text-[var(--color-text-secondary)] break-words">
              {copy.body}
            </p>
          )}
          {key === "unavailable" && allowRetry && (
            <button
              type="button"
              onClick={() => void refresh(true)}
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-accent)] hover:underline cursor-pointer bg-transparent border-none p-0"
            >
              <RefreshCw size={11} strokeWidth={2.5} aria-hidden="true" />
              Check again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
