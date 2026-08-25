"use client";

import { useState, useCallback, useEffect } from "react";
import { ClButton, ClBadge, ClBackButton } from "@/components/ui";
import { Check, Plus } from "lucide-react";
import { EscrowTimeline } from "@/components/booking/EscrowTimeline";
import { MilestoneTimeline } from "@/components/booking/MilestoneTimeline";
import { DisputeModal } from "@/components/booking/DisputeModal";
import { useAuth } from "@/hooks/useAuth";
import { buildProviderSlug } from "@/lib/slug";
import type { IBooking, IPayment, IBookingMilestone } from "@/types";

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
  const [milestones, setMilestones] = useState<IBookingMilestone[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [releasing, setReleasing] = useState(false);
  const [addingPayment, setAddingPayment] = useState(false);

  const viewerRole =
    user?.id === data.client?.id ? "CLIENT" : "PROVIDER";
  const isClient = viewerRole === "CLIENT";
  const isProvider = viewerRole === "PROVIDER";

  const handleConfirmRelease = useCallback(async () => {
    setReleasing(true);
    try {
      const res = await fetch(
        `/api/bookings/${data.booking.id}/release`,
        { method: "POST" },
      );
      const json = await res.json();
      if (json.success) {
        window.location.reload();
      }
    } catch {
    } finally {
      setReleasing(false);
    }
  }, [data.booking.id]);

  const fetchMilestones = useCallback(async () => {
    try {
      const res = await fetch(`/api/milestones?bookingId=${data.booking.id}`);
      const json = await res.json();
      if (json.success) setMilestones(json.data);
    } catch {
    }
  }, [data.booking.id]);

  const handleFundMilestone = useCallback(async (milestoneId: string) => {
    setActionLoading(milestoneId);
    try {
      const res = await fetch("/api/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "fund", milestoneId }),
      });
      const json = await res.json();
      if (json.success) fetchMilestones();
    } catch {
    } finally {
      setActionLoading(null);
    }
  }, [fetchMilestones]);

  const handleSubmitMilestone = useCallback(async (milestoneId: string) => {
    setActionLoading(milestoneId);
    try {
      const res = await fetch("/api/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit", milestoneId }),
      });
      const json = await res.json();
      if (json.success) fetchMilestones();
    } catch {
    } finally {
      setActionLoading(null);
    }
  }, [fetchMilestones]);

  const handleApproveMilestone = useCallback(async (milestoneId: string) => {
    setActionLoading(milestoneId);
    try {
      const res = await fetch("/api/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", milestoneId }),
      });
      const json = await res.json();
      if (json.success) fetchMilestones();
    } catch {
    } finally {
      setActionLoading(null);
    }
  }, [fetchMilestones]);

  const handleDisputeMilestone = useCallback(async () => {
    setShowDispute(true);
  }, []);

  const isMilestoneMode = data.booking.paymentMode === "MILESTONE";
  const isDirectMode = data.booking.paymentMode === "DIRECT";

  useEffect(() => {
    if (isMilestoneMode) fetchMilestones();
  }, [isMilestoneMode, fetchMilestones]);

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
          <div className="flex items-center gap-2">
            <ClBadge variant="default">
              {data.booking.paymentMode}
            </ClBadge>
            <ClBadge variant={statusBadgeVariant(data.booking.status)}>
              {data.booking.status.replace("_", " ")}
            </ClBadge>
          </div>
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
                    <Check size={12} strokeWidth={2.5} color="var(--color-accent)" />
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

        {isMilestoneMode ? (
          <MilestoneTimeline
            milestones={milestones}
            isClient={isClient}
            isProvider={isProvider}
            loadingId={actionLoading}
            onFund={isClient ? handleFundMilestone : undefined}
            onSubmit={isProvider ? handleSubmitMilestone : undefined}
            onApprove={isClient ? handleApproveMilestone : undefined}
            onDispute={isClient ? handleDisputeMilestone : undefined}
          />
        ) : (
          <EscrowTimeline
            booking={data.booking}
            payment={data.payment}
            viewerRole={viewerRole}
            releaseLoading={releasing}
            onConfirmRelease={handleConfirmRelease}
            onRaiseDispute={() => setShowDispute(true)}
          />
        )}

        {isDirectMode && isClient && (
          <div className="mt-5">
            <ClButton
              variant="primary"
              fullWidth
              loading={addingPayment}
              onClick={async () => {
                setAddingPayment(true);
                try {
                  const res = await fetch("/api/wallet/topup/card", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ amountKobo: data.booking.total }),
                  });
                  const json = await res.json();
                  if (json.success) {
                    window.location.href = json.data.authorizationUrl;
                  }
                } catch {
                } finally {
                  setAddingPayment(false);
                }
              }}
            >
              <Plus size={14} strokeWidth={2} />
              Add Payment
            </ClButton>
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <ClBackButton
            href={data.provider ? `/profile/${buildProviderSlug(data.provider.displayName, data.provider.id)}` : "/bookings"}
            label={data.provider ? "Back to Profile" : "Back to Bookings"}
          />
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
