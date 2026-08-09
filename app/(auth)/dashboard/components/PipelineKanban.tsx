import Link from "next/link";
import { formatKobo } from "@/lib/currency";
import { ClBadge } from "@/components/ui";
import type { IDashboardPipelineColumn, IDashboardBooking } from "@/types";

const columnCountTones: Record<string, string> = {
  requested: "bg-[var(--color-escrow-held)] text-[var(--color-text-inverse)]",
  pending: "bg-[var(--color-escrow-held)] text-[var(--color-text-inverse)]",
  confirmed: "bg-[var(--color-escrow-progress)] text-[var(--color-text-inverse)]",
  "in-progress": "bg-[var(--color-info)] text-[var(--color-text-inverse)]",
  completed: "bg-[var(--color-success)] text-[var(--color-text-inverse)]",
};

function bookingBadgeVariant(status: string) {
  switch (status) {
    case "REQUESTED":
    case "ACCEPTED":
      return "warning" as const;
    case "HELD":
      return "warning" as const;
    case "IN_PROGRESS":
      return "accent" as const;
    case "RELEASED":
      return "success" as const;
    case "DISPUTED":
      return "error" as const;
    case "REFUNDED":
      return "error" as const;
    default:
      return "default" as const;
  }
}

function BookingCard({ item, side }: { item: IDashboardBooking; side: "provider" | "client" }) {
  const counterpart = side === "provider" ? item.clientName : item.providerName;
  const date = item.booking.serviceDate
    ? new Date(item.booking.serviceDate).toLocaleDateString("en-NG", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Date TBD";

  return (
    <Link
      href={`/bookings/${item.booking.id}`}
      className="mb-3 block rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4 no-underline transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-[var(--color-border-mid)]"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="truncate text-[13px] font-semibold text-[var(--color-text-primary)]">
          {counterpart}
        </span>
        <ClBadge variant={bookingBadgeVariant(item.booking.status)}>
          {item.booking.status.replace("_", " ")}
        </ClBadge>
      </div>
      <div className="text-[13px] text-[var(--color-text-secondary)]">{item.packageLabel}</div>
      <div className="mt-0.5 text-[12px] text-[var(--color-text-tertiary)]">
        Service: {date}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span
          className="text-[14px] font-medium text-[var(--color-accent)] tabular-nums"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {formatKobo(item.booking.total)}
        </span>
        <span className="text-[12px] text-[var(--color-text-tertiary)]">View →</span>
      </div>
    </Link>
  );
}

export function PipelineKanban({
  columns,
  side,
}: {
  columns: IDashboardPipelineColumn[];
  side: "provider" | "client";
}) {
  const visible = columns.filter((c) => c.bookings.length > 0);

  if (visible.length === 0) {
    return (
      <div className="text-center py-8 text-[13px] text-[var(--color-text-tertiary)]">
        No bookings yet — they will appear here as requests come in.
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto p-4 max-[480px]:px-5 scrollbar-thin">
      {visible.map((col) => (
        <div key={col.key} className="min-w-[280px] flex-shrink-0">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">
              {col.label}
            </span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                columnCountTones[col.key] ?? "bg-[var(--color-border-mid)] text-[var(--color-text-inverse)]"
              }`}
            >
              {col.bookings.length}
            </span>
          </div>
          {col.bookings.map((item) => (
            <BookingCard key={item.id} item={item} side={side} />
          ))}
        </div>
      ))}
    </div>
  );
}
