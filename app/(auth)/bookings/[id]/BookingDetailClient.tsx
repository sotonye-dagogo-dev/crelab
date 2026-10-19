"use client";

import { useState, useCallback, useEffect } from "react";
import { ClButton, ClBadge, ClBackButton, ClConfirmDialog } from "@/components/ui";
import { Check, CheckCircle2, Clock, PlayCircle, XCircle } from "lucide-react";
import { EscrowTimeline } from "@/components/booking/EscrowTimeline";
import { MilestoneTimeline } from "@/components/booking/MilestoneTimeline";
import { NextStepBanner } from "@/components/booking/NextStepBanner";
import { DisputeModal } from "@/components/booking/DisputeModal";
import { BookingPayPanel } from "./BookingPayPanel";
import { useToast } from "@/lib/toast";
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
  /**
   * Derived SERVER-side from the session (client / provider / admin) so a
   * stranger who guesses a booking id can never see another party's actions
   * (and the admin keeps a working view).
   */
  viewerRole: "CLIENT" | "PROVIDER" | "ADMIN";
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

export function BookingDetailClient({ data, viewerRole }: BookingDetailClientProps) {
  const { toast } = useToast();
  const [showDispute, setShowDispute] = useState(false);
  const [milestones, setMilestones] = useState<IBookingMilestone[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [releasing, setReleasing] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<
    "decline" | "cancel" | "release" | "provider-cancel" | null
  >(null);

  // ADMIN acts through the provider-side controls (server allows it too).
  const effectiveRole = viewerRole === "ADMIN" ? "PROVIDER" : viewerRole;
  const isClient = effectiveRole === "CLIENT";
  const isProvider = effectiveRole === "PROVIDER";

  const handleConfirmRelease = useCallback(async () => {
    setPendingConfirm(null);
    setReleasing(true);
    try {
      const res = await fetch(
        `/api/bookings/${data.booking.id}/release`,
        { method: "POST" },
      );
      const json = await res.json().catch(() => null);
      if (json?.success) {
        window.location.reload();
      } else {
        // Never fail silently on a money action — surface the real reason.
        toast(
          json?.error ?? "Could not release the payment — please try again.",
          "error",
        );
      }
    } catch {
      toast("Could not release the payment — please check your connection and try again.", "error");
    } finally {
      setReleasing(false);
    }
  }, [data.booking.id, toast]);

  /** Releasing pays the provider irreversibly — always confirm first. */
  const requestConfirmRelease = useCallback(() => {
    setPendingConfirm("release");
  }, []);

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

  const showPayPanel =
    isClient &&
    data.booking.status === "ACCEPTED" &&
    !isMilestoneMode;

  /**
   * Shared lifecycle action caller (accept / decline / cancel / start). All
   * four routes: `requireAuth` → 404 → actor assert → service call → audit
   * log. Failures come back as a human-readable `error` we always surface —
   * never swallow, and reload so the badge/timeline reflect the server truth.
   */
  const runBookingAction = useCallback(
    async (action: "accept" | "decline" | "cancel" | "start", label: string) => {
      setActionLoading(action);
      try {
        const res = await fetch(`/api/bookings/${data.booking.id}/${action}`, {
          method: "POST",
        });
        const json = await res.json().catch(() => null);
        if (json?.success) {
          toast(label, "success");
          window.location.reload();
        } else {
          toast(
            json?.error ?? "Could not update the booking — please try again.",
            "error",
          );
        }
      } catch {
        toast("Could not reach the server — please check your connection and try again.", "error");
      } finally {
        setActionLoading(null);
      }
    },
    [data.booking.id, toast],
  );

  const handleAccept = useCallback(
    () => void runBookingAction("accept", "Booking accepted — the client can now pay."),
    [runBookingAction],
  );
  const handleDeclineConfirmed = useCallback(() => {
    setPendingConfirm(null);
    void runBookingAction("decline", "Booking declined.");
  }, [runBookingAction]);
  const handleCancelConfirmed = useCallback(() => {
    setPendingConfirm(null);
    void runBookingAction("cancel", "Booking cancelled.");
  }, [runBookingAction]);
  const handleProviderCancelConfirmed = useCallback(() => {
    setPendingConfirm(null);
    void runBookingAction("cancel", "Booking cancelled — the client has been notified.");
  }, [runBookingAction]);
  const handleStart = useCallback(
    () => void runBookingAction("start", "Work marked as started."),
    [runBookingAction],
  );

  useEffect(() => {
    if (isMilestoneMode) fetchMilestones();
  }, [isMilestoneMode, fetchMilestones]);

  // `?action=pay` (redirected here from the create flow) scrolls straight to
  // the pay panel so the client lands on the next real step.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("action") === "pay") {
      document
        .getElementById("pay-panel")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

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
              {isClient ? "Provider" : "Client"}
            </p>
            <p className="text-[14px] text-[var(--color-text-primary)] font-medium">
              {isClient ? data.provider.displayName : data.client?.name ?? "Unknown"}
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

        {/* ── Pay panel: client + ACCEPTED + non-milestone (the money path). ── */}
        {showPayPanel && (
          <BookingPayPanel
            booking={data.booking}
            providerName={data.provider?.displayName ?? null}
          />
        )}

        {/* ── Lifecycle action matrix (per PRD: accept/decline before pay). ── */}

        {isClient && data.booking.status === "REQUESTED" && (
          <div className="mt-5 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={15} strokeWidth={2} color="var(--color-text-tertiary)" />
              <p className="text-[13px] font-medium text-[var(--color-text-primary)]">
                Awaiting provider response
              </p>
            </div>
            <p className="text-[13px] text-[var(--color-text-secondary)] mb-3">
              {data.provider?.displayName ?? "The provider"} hasn&apos;t responded yet. Once they
              accept, you can pay into escrow from this page.
            </p>
            <ClButton
              variant="outlined"
              disabled={actionLoading !== null}
              onClick={() => setPendingConfirm("cancel")}
            >
              Cancel Request
            </ClButton>
          </div>
        )}

        {isClient &&
          (data.booking.status === "DECLINED" || data.booking.status === "CANCELLED") && (
            <div className="mt-5 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <div className="flex items-center gap-2 mb-2">
                <XCircle size={15} strokeWidth={2} color="var(--color-text-tertiary)" />
                <p className="text-[13px] font-medium text-[var(--color-text-primary)]">
                  {data.booking.status === "DECLINED" ? "Declined by the provider" : "Cancelled"}
                </p>
              </div>
              <p className="text-[13px] text-[var(--color-text-secondary)]">
                {data.booking.status === "DECLINED"
                  ? "The provider couldn't take this booking. Nothing was charged — you can book someone else any time."
                  : "This booking was cancelled. Nothing was charged."}
              </p>
            </div>
          )}

        {isProvider && data.booking.status === "REQUESTED" && (
          <div className="mt-5 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={15} strokeWidth={2} color="var(--color-warning)" />
              <p className="text-[13px] font-medium text-[var(--color-text-primary)]">
                New booking request
              </p>
            </div>
            <p className="text-[13px] text-[var(--color-text-secondary)] mb-3">
              Review the scope above. Accepting lets the client pay into escrow; declining closes
              the request at no cost to either of you.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <ClButton
                variant="primary"
                loading={actionLoading === "accept"}
                disabled={actionLoading !== null}
                onClick={handleAccept}
              >
                <CheckCircle2 size={15} strokeWidth={2} className="mr-1.5" />
                Accept Booking
              </ClButton>
              <ClButton
                variant="outlined"
                disabled={actionLoading !== null}
                onClick={() => setPendingConfirm("decline")}
              >
                <XCircle size={15} strokeWidth={2} className="mr-1.5" />
                Decline
              </ClButton>
            </div>
          </div>
        )}

        {isProvider && data.booking.status === "ACCEPTED" && (
          <div className="mt-5 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={15} strokeWidth={2} color="var(--color-text-tertiary)" />
              <p className="text-[13px] font-medium text-[var(--color-text-primary)]">
                Waiting for client payment
              </p>
            </div>
            <p className="text-[13px] text-[var(--color-text-secondary)] mb-3">
              {data.client?.name ?? "The client"} can now pay into escrow — you&apos;ll be notified
              as soon as the funds are held and the work can begin.
            </p>
            {/* The provider needs a way out of an accepted-but-unpaid booking
                they can no longer deliver — nothing has been charged, so this
                is a plain status transition (confirmed, like the client's). */}
            <ClButton
              variant="outlined"
              disabled={actionLoading !== null}
              onClick={() => setPendingConfirm("provider-cancel")}
            >
              Cancel Booking
            </ClButton>
          </div>
        )}

        {isProvider && data.booking.status === "HELD" && !isMilestoneMode && (
          <div className="mt-5 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <PlayCircle size={15} strokeWidth={2} color="var(--color-accent)" />
              <p className="text-[13px] font-medium text-[var(--color-text-primary)]">
                Funds are held in escrow
              </p>
            </div>
            <p className="text-[13px] text-[var(--color-text-secondary)] mb-3">
              The client&apos;s payment is secured. Mark the work as started once you begin — they
              release the funds when they approve the delivery.
            </p>
            <ClButton
              variant="primary"
              loading={actionLoading === "start"}
              disabled={actionLoading !== null}
              onClick={handleStart}
            >
              <PlayCircle size={15} strokeWidth={2} className="mr-1.5" />
              Start Work
            </ClButton>
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
            viewerRole={effectiveRole}
            releaseLoading={releasing}
            onConfirmRelease={requestConfirmRelease}
            onRaiseDispute={() => setShowDispute(true)}
          />
        )}

        {/* ── "Who acts next" banner: only for states/sides with no panel
             (guidance returns null when a panel already exists, and the
             admin toggle/copy overrides resolve inside the banner). ── */}
        {!isMilestoneMode && (
          <NextStepBanner
            status={data.booking.status}
            side={isClient ? "client" : "provider"}
            ctx={{
              milestone: isMilestoneMode,
              clientName: data.client?.name ?? null,
              providerName: data.provider?.displayName ?? null,
            }}
          />
        )}

        <ClConfirmDialog
          open={pendingConfirm === "decline"}
          title="Decline this booking?"
          message="The client will be told the request was declined, and nothing is charged. This can't be undone — they'd need to book again."
          confirmLabel="Decline Booking"
          loading={actionLoading === "decline"}
          onConfirm={handleDeclineConfirmed}
          onCancel={() => setPendingConfirm(null)}
        />

        <ClConfirmDialog
          open={pendingConfirm === "cancel"}
          title="Cancel this request?"
          message="The provider will be told the request was cancelled, and nothing is charged. This can't be undone."
          confirmLabel="Cancel Booking"
          loading={actionLoading === "cancel"}
          onConfirm={handleCancelConfirmed}
          onCancel={() => setPendingConfirm(null)}
        />

        <ClConfirmDialog
          open={pendingConfirm === "provider-cancel"}
          title="Cancel this booking?"
          message={`${data.client?.name ?? "The client"} will be told the booking was cancelled, and nothing is charged since no payment has been held yet. This can't be undone — they'd need to book again.`}
          confirmLabel="Cancel Booking"
          loading={actionLoading === "cancel"}
          onConfirm={handleProviderCancelConfirmed}
          onCancel={() => setPendingConfirm(null)}
        />

        {/* Releasing pays the provider irreversibly — confirm before the money
            moves (design-system UX-3: every destructive action confirms). */}
        <ClConfirmDialog
          open={pendingConfirm === "release"}
          title="Release the escrow payment?"
          message={`Releasing pays ${data.provider?.displayName ?? "the provider"} for this booking and can't be undone. Only confirm if you're happy with the delivered work — otherwise raise a dispute instead.`}
          confirmLabel="Release Payment"
          loading={releasing}
          onConfirm={handleConfirmRelease}
          onCancel={() => setPendingConfirm(null)}
        />

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
