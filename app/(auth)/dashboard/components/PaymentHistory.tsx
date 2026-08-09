import Link from "next/link";
import { formatKobo } from "@/lib/currency";
import { ClBadge } from "@/components/ui";
import type { IClientPaymentRecord } from "@/types";

function statusVariant(status: string) {
  switch (status) {
    case "RELEASED":
      return "success" as const;
    case "HELD":
    case "IN_PROGRESS":
      return "warning" as const;
    case "DISPUTED":
    case "REFUNDED":
      return "error" as const;
    default:
      return "default" as const;
  }
}

export function PaymentHistory({ records }: { records: IClientPaymentRecord[] }) {
  if (records.length === 0) {
    return (
      <div className="text-center py-8 text-[13px] text-[var(--color-text-tertiary)]">
        No payments yet — they will appear here once you book a creator.
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {records.map((record) => (
        <Link
          key={record.id}
          href={`/bookings/${record.bookingId}`}
          className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] px-4 py-4 no-underline transition-colors duration-150 last:border-b-0 hover:bg-[var(--color-surface-raised)]"
        >
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-[var(--color-text-primary)]">
              {record.providerName}
            </p>
            <p className="mt-0.5 text-[12px] text-[var(--color-text-secondary)]">
              {record.packageLabel}
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--color-text-tertiary)]">
              {new Date(record.createdAt).toLocaleDateString("en-NG", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
              {" · "}
              {record.paystackRef.slice(0, 12)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span
              className="text-[14px] font-medium text-[var(--color-accent)] tabular-nums"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {formatKobo(record.amount)}
            </span>
            <ClBadge variant={statusVariant(record.status)}>
              {record.status.replace("_", " ")}
            </ClBadge>
          </div>
        </Link>
      ))}
    </div>
  );
}
