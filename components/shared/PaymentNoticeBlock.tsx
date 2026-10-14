import { AlertTriangle, Info } from "lucide-react";
import type { ResolvedPaymentNotice } from "@/lib/payment-notices";

/**
 * Presentational payment notice/disclaimer block. Pure props (no config hook),
 * so it renders identically from server and client components — callers resolve
 * the copy with `resolvePaymentNotice(s)` first.
 *
 * `tone="warning"` marks action-critical disclaimers (payout/bank details);
 * `info` (default) marks explanatory copy (fees, escrow).
 */
interface PaymentNoticeBlockProps {
  notice: ResolvedPaymentNotice | null | undefined;
  tone?: "info" | "warning";
  className?: string;
}

export function PaymentNoticeBlock({ notice, tone = "info", className }: PaymentNoticeBlockProps) {
  if (!notice || (!notice.title && !notice.body)) return null;

  const isWarning = tone === "warning";
  const Icon = isWarning ? AlertTriangle : Info;

  return (
    <div
      role="note"
      className={`rounded-[10px] border p-3.5 flex items-start gap-2.5 ${
        isWarning
          ? "bg-[var(--color-surface-raised)]"
          : "border-[var(--color-border)] bg-[var(--color-surface-raised)]"
      } ${className ?? ""}`}
      style={isWarning ? { borderColor: "var(--color-warning)" } : undefined}
    >
      <Icon
        size={14}
        strokeWidth={2}
        aria-hidden="true"
        className="shrink-0 mt-0.5"
        style={{ color: isWarning ? "var(--color-warning)" : "var(--color-accent)" }}
      />
      <div className="min-w-0">
        {notice.title && (
          <div className="text-[12px] font-semibold text-[var(--color-text-primary)] mb-1 break-words">
            {notice.title}
          </div>
        )}
        {notice.body && (
          <p className="text-[12px] leading-relaxed text-[var(--color-text-secondary)] break-words">
            {notice.body}
          </p>
        )}
      </div>
    </div>
  );
}
