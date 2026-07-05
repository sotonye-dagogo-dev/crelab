"use client";

import { useState, useCallback } from "react";
import { ClButton, ClBadge } from "@/components/ui";
import { EscrowTimeline } from "@/components/booking/EscrowTimeline";
import { DisputeModal } from "@/components/booking/DisputeModal";
import { useAuth } from "@/hooks/useAuth";
import type { IBooking, IPayment } from "@/types";

interface BookingDetailData {
  booking: IBooking;
  payment: IPayment | null;
  provider: { id: string; displayName: string; avatarUrl: string | null } | null;
  client: { id: string; name: string } | null;
  package: {
    id: string;
    label: string;
    tier: string;
    deliverables: string[];
    turnaroundDays: number;
  } | null;
}

interface BookingDetailClientProps {
  data: BookingDetailData;
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
    case "DECLINED":
    case "CANCELLED":
      return "default" as const;
    default:
      return "default" as const;
  }
}

export function BookingDetailClient({ data }: BookingDetailClientProps) {
  const { user } = useAuth();
  const [showDispute, setShowDispute] = useState(false);

  const viewerRole =
    user?.id === data.client?.id ? "CLIENT" : "PROVIDER";

  const handleConfirmRelease = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/bookings/${data.booking.id}/release`,
        { method: "POST" },
      );
      const json = await res.json();
      if (json.success) {
        window.location.reload();
      }
    } catch (err) {
      console.error("Failed to confirm release:", err);
    }
  }, [data.booking.id]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-[800px] mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-[family-name:var(--font-display)] font-bold text-[22px] text-[var(--color-text-primary)]">
              Booking Details
            </h1>
            <p className="text-[13px] text-[var(--color-text-secondary)] font-mono mt-1">
              ID: {data.booking.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <ClBadge variant={statusBadgeVariant(data.booking.status)}>
            {data.booking.status.replace("_", " ")}
          </ClBadge>
        </div>

        {data.provider && (
          <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 mb-5">
            <p className="text-[12px] text-[var(--color-text-tertiary)] mb-1">
              {viewerRole === "CLIENT" ? "Provider" : "Client"}
            </p>
            <p className="text-[14px] text-[var(--color-text-primary)] font-medium">
              {viewerRole === "CLIENT"
                ? data.provider.displayName
                : data.client?.name ?? "Unknown"}
            </p>
          </div>
        )}

        {data.package && (
          <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 mb-5">
            <h3 className="text-[13px] font-medium text-[var(--color-text-secondary)] mb-2">
              Service Package
            </h3>
            <p className="text-[14px] text-[var(--color-text-primary)] font-medium">
              {data.package.label}
            </p>
            <p className="text-[12px] text-[var(--color-text-tertiary)]">
              {data.package.tier} · {data.package.turnaroundDays} day delivery
            </p>
            {data.package.deliverables.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1">
                {data.package.deliverables.map((item, i) => (
                  <li
                    key={i}
                    className="text-[13px] text-[var(--color-text-secondary)] flex items-center gap-2"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--color-accent)"
                      strokeWidth="2.5"
                    >
                      <polyline points="20,6 9,17 4,12" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {data.booking.scopeNotes && (
          <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 mb-5">
            <h3 className="text-[13px] font-medium text-[var(--color-text-secondary)] mb-2">
              Scope Notes
            </h3>
            <p className="text-[14px] text-[var(--color-text-primary)] leading-relaxed">
              {data.booking.scopeNotes}
            </p>
          </div>
        )}

        <EscrowTimeline
          booking={data.booking}
          payment={data.payment}
          viewerRole={viewerRole}
          onConfirmRelease={handleConfirmRelease}
          onRaiseDispute={() => setShowDispute(true)}
        />

        <div className="mt-5 flex justify-end">
          <ClButton
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
          >
            Back to Bookings
          </ClButton>
        </div>
      </div>

      <DisputeModal
        open={showDispute}
        onClose={() => setShowDispute(false)}
        bookingId={data.booking.id}
        clientId={data.client?.id ?? ""}
      />
    </div>
  );
}
