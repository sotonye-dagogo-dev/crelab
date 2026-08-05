"use client";

import { ClButton } from "@/components/ui";
import type { IBookingMilestone } from "@/types";

interface MilestoneTimelineProps {
  milestones: IBookingMilestone[];
  isClient: boolean;
  isProvider: boolean;
  loadingId?: string | null;
  onFund?: (milestoneId: string) => void;
  onSubmit?: (milestoneId: string) => void;
  onApprove?: (milestoneId: string) => void;
  onDispute?: (milestoneId: string) => void;
}

const statusColors: Record<string, string> = {
  PENDING: "bg-[var(--color-surface-raised)] text-[var(--color-text-tertiary)]",
  FUNDED: "bg-[rgba(232,255,71,0.15)] text-[var(--color-accent)]",
  IN_PROGRESS: "bg-[rgba(59,130,246,0.15)] text-blue-500",
  SUBMITTED: "bg-[rgba(251,191,36,0.15)] text-amber-500",
  APPROVED: "bg-[rgba(74,222,128,0.15)] text-green-500",
  RELEASED: "bg-[rgba(74,222,128,0.15)] text-green-600",
  DISPUTED: "bg-[rgba(239,68,68,0.15)] text-red-500",
  REFUNDED: "bg-[rgba(239,68,68,0.15)] text-red-600",
  CANCELLED: "bg-[var(--color-surface-raised)] text-[var(--color-text-tertiary)]",
};

export function MilestoneTimeline({
  milestones,
  isClient,
  isProvider,
  loadingId = null,
  onFund,
  onSubmit,
  onApprove,
  onDispute,
}: MilestoneTimelineProps) {
  const totalReleased = milestones.filter((m) => m.status === "RELEASED" || m.status === "APPROVED").length;
  const totalAmount = milestones.reduce((sum, m) => sum + m.amountKobo, 0);
  const releasedAmount = milestones
    .filter((m) => m.status === "RELEASED" || m.status === "APPROVED")
    .reduce((sum, m) => sum + m.amountKobo, 0);

  const currentMilestone = milestones.find(
    (m) => m.status !== "RELEASED" && m.status !== "APPROVED" && m.status !== "CANCELLED" && m.status !== "REFUNDED",
  );

  return (
    <div>
      <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4 mb-5">
        <p className="text-[13px] text-[var(--color-text-secondary)]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {totalReleased} of {milestones.length} milestones released (₦
          {(releasedAmount / 100).toLocaleString()} of ₦
          {(totalAmount / 100).toLocaleString()})
        </p>
      </div>

      <div className="flex flex-col gap-0">
        {milestones.map((milestone, index) => {
          const isComplete = milestone.status === "RELEASED" || milestone.status === "APPROVED";
          const isCurrent = currentMilestone?.id === milestone.id;

          return (
            <div key={milestone.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold border-2 shrink-0
                    ${isComplete
                      ? "bg-[rgba(74,222,128,0.15)] border-green-500 text-green-600"
                      : isCurrent
                        ? "bg-[rgba(232,255,71,0.15)] border-[var(--color-accent)] text-[var(--color-accent)]"
                        : "bg-[var(--color-surface-raised)] border-[var(--color-border)] text-[var(--color-text-tertiary)]"
                    }`}
                >
                  {isComplete ? "✓" : index + 1}
                </div>
                {index < milestones.length - 1 && (
                  <div
                    className={`w-0.5 h-full min-h-[24px] ${
                      isComplete ? "bg-green-500" : "bg-[var(--color-border)]"
                    }`}
                  />
                )}
              </div>

              <div className={`pb-6 flex-1 ${isCurrent ? "" : ""}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                    {milestone.title || `Milestone ${milestone.index}`}
                  </span>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${statusColors[milestone.status] ?? ""}`}
                  >
                    {milestone.status}
                  </span>
                </div>

                {milestone.description && (
                  <p className="text-[12px] text-[var(--color-text-secondary)] mb-1">
                    {milestone.description}
                  </p>
                )}

                <p
                  className="text-[12px] text-[var(--color-text-secondary)]"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  ₦{(milestone.amountKobo / 100).toLocaleString()}
                </p>

                {milestone.dueDate && (
                  <p className="text-[11px] text-[var(--color-text-tertiary)]">
                    Due: {new Date(milestone.dueDate).toLocaleDateString()}
                  </p>
                )}

                {isCurrent && (
                  <div className="flex gap-2 mt-3">
                    {isClient && milestone.status === "PENDING" && onFund && (
                      <ClButton size="sm" variant="primary" loading={loadingId === milestone.id} onClick={() => onFund(milestone.id)}>
                        Fund Milestone
                      </ClButton>
                    )}

                    {isProvider && milestone.status === "FUNDED" && onSubmit && (
                      <ClButton size="sm" variant="primary" loading={loadingId === milestone.id} onClick={() => onSubmit(milestone.id)}>
                        Submit Work
                      </ClButton>
                    )}

                    {isClient && milestone.status === "SUBMITTED" && onApprove && (
                      <ClButton size="sm" variant="primary" loading={loadingId === milestone.id} onClick={() => onApprove(milestone.id)}>
                        Approve & Release
                      </ClButton>
                    )}

                    {isClient && milestone.status === "SUBMITTED" && onDispute && (
                      <ClButton size="sm" variant="outlined" onClick={() => onDispute(milestone.id)}>
                        Dispute
                      </ClButton>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
