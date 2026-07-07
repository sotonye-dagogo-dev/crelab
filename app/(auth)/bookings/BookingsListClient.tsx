"use client";

import Link from "next/link";
import { ClBadge } from "@/components/ui";
import { ChevronRight } from "lucide-react";
import type { IBooking, IPayment } from "@/types";

interface BookingRow {
  booking: IBooking;
  payment: IPayment | null;
  providerName: string;
  clientName: string;
  packageLabel: string;
}

interface BookingsListClientProps {
  groups: {
    key: string;
    label: string;
    bookings: BookingRow[];
  }[];
}

function statusBadgeVariant(status: string) {
  switch (status) {
    case "REQUESTED":
    case "ACCEPTED":
      return "info" as const;
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

export function BookingsListClient({ groups }: BookingsListClientProps) {
  const visibleGroups = groups.filter((g) => g.bookings.length > 0);

  if (visibleGroups.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)]">
        <div className="max-w-[800px] mx-auto px-4 py-8">
          <h1 className="font-[family-name:var(--font-display)] font-bold text-[22px] text-[var(--color-text-primary)] mb-6">
            Bookings
          </h1>
          <div className="text-center py-16">
            <p className="text-[14px] text-[var(--color-text-secondary)]">
              No bookings yet
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-[800px] mx-auto px-4 py-8">
        <h1 className="font-[family-name:var(--font-display)] font-bold text-[22px] text-[var(--color-text-primary)] mb-6">
          Bookings
        </h1>

        {visibleGroups.map((group) => (
          <section key={group.key} className="mb-8">
            <h2 className="font-[family-name:var(--font-display)] font-bold text-[16px] text-[var(--color-text-primary)] mb-3">
              {group.label}
              <span className="text-[var(--color-text-tertiary)] ml-2 text-[14px]">
                ({group.bookings.length})
              </span>
            </h2>

            <div className="flex flex-col gap-2">
              {group.bookings.map((item) => (
                <Link
                  key={item.booking.id}
                  href={`/bookings/${item.booking.id}`}
                  className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 hover:border-[var(--color-border-mid)] transition-colors no-underline block"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium text-[var(--color-text-primary)] truncate">
                        {item.packageLabel}
                      </p>
                      <p className="text-[12px] text-[var(--color-text-secondary)] mt-0.5">
                        {item.providerName}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <ClBadge variant={statusBadgeVariant(item.booking.status)}>
                        {item.booking.status.replace("_", " ")}
                      </ClBadge>
                      <ChevronRight size={16} strokeWidth={2} color="var(--color-text-tertiary)" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
