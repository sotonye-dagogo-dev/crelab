"use client";

import Link from "next/link";
import { AlertTriangle, FlaskConical, Info, Settings2 } from "lucide-react";
import { usePlatformConfig } from "@/lib/config-context";
import {
  resolvePaymentStatusCopy,
  type PaymentStatusCopyKey,
} from "@/lib/payments/status";
import type { PaymentProviderStatus } from "@/services/PaymentProviderService";

interface PaymentEnvironmentBannerProps {
  status: PaymentProviderStatus | null;
}

type Tone = "danger" | "warning" | "info";

const TONE: Record<Tone, { border: string; bg: string; icon: string; Icon: typeof Info }> = {
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
    border: "var(--color-border-mid)",
    bg: "var(--color-surface-raised)",
    icon: "var(--color-accent)",
    Icon: Info,
  },
};

/**
 * Admin-wide payment environment awareness (rendered by the admin shell):
 * no usable provider, active test/sandbox mode, or a fallback rail handling
 * new money. Copy is admin-editable under `payments.status.admin*`; provider
 * identities are safe to show here (admins already see them in finance).
 */
export function PaymentEnvironmentBanner({ status }: PaymentEnvironmentBannerProps) {
  const config = usePlatformConfig();
  const enabled = config.payments?.status?.adminBannerEnabled !== false;
  if (!status || !enabled) return null;

  let key: PaymentStatusCopyKey | null = null;
  let tone: Tone = "info";
  if (!status.available) {
    key = "adminUnavailable";
    tone = "danger";
  } else if (status.testMode) {
    key = "adminTestMode";
    tone = "warning";
  } else if (status.fallbackUsed) {
    key = "adminFallback";
    tone = "info";
  }

  if (!key) return null;

  const copy = resolvePaymentStatusCopy(config, key, {
    provider: status.fallbackFromLabel ?? status.providerLabel ?? undefined,
    fallback: status.providerLabel ?? undefined,
  });
  const { Icon, border, bg, icon } = TONE[tone];

  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className="mb-5 rounded-[12px] border p-4 flex items-start gap-3"
      style={{ borderColor: border, backgroundColor: bg }}
    >
      <Icon
        size={17}
        strokeWidth={2}
        aria-hidden="true"
        className="shrink-0 mt-0.5"
        style={{ color: icon }}
      />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-1">
          {copy.title}
        </div>
        <p className="text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
          {copy.body}
        </p>
        {tone === "danger" && status.reason && (
          <p className="text-[11px] text-[var(--color-text-tertiary)] mt-1.5 break-words">
            {status.reason}
          </p>
        )}
      </div>
      <Link
        href="/admin/config"
        className="shrink-0 inline-flex items-center gap-1.5 rounded-[8px] border border-[var(--color-border-mid)] px-3 py-1.5 text-[11px] font-semibold text-[var(--color-text-primary)] no-underline hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
      >
        <Settings2 size={12} strokeWidth={2} aria-hidden="true" />
        Configure
      </Link>
    </div>
  );
}
