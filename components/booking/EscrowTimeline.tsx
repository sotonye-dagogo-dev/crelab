"use client";

import { useState, useEffect } from "react";
import { ClButton } from "@/components/ui";
import type { IBooking, IPayment } from "@/types";

interface EscrowTimelineProps {
  booking: IBooking;
  payment: IPayment | null;
  viewerRole: "CLIENT" | "PROVIDER";
  onConfirmRelease?: () => void;
  onRaiseDispute?: () => void;
}

interface TimelineNode {
  key: string;
  label: string;
  description: string;
  isCompleted: boolean;
  isCurrent: boolean;
}

function formatCountdown(target: string): string {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return "Past deadline";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${days}d ${hours}h ${mins}m remaining`;
}

export function EscrowTimeline({
  booking,
  payment,
  viewerRole,
  onConfirmRelease,
  onRaiseDispute,
}: EscrowTimelineProps) {
  const [countdown, setCountdown] = useState("");
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (
      !booking.releaseDeadline ||
      booking.status === "RELEASED" ||
      booking.status === "REFUNDED" ||
      booking.status === "DISPUTED"
    ) {
      setCountdown("");
      return;
    }

    setCountdown(formatCountdown(booking.releaseDeadline));
    const interval = setInterval(() => {
      setCountdown(formatCountdown(booking.releaseDeadline!));
    }, 60000);

    return () => clearInterval(interval);
  }, [booking.releaseDeadline, booking.status]);

  const stateOrder = [
    "PENDING",
    "HELD",
    "IN_PROGRESS",
    "RELEASED",
  ] as const;

  const currentState =
    booking.escrowState === "REFUNDED" || booking.escrowState === "DISPUTED"
      ? booking.escrowState
      : (stateOrder.indexOf(booking.escrowState as typeof stateOrder[number]) >= 0
          ? booking.escrowState
          : "PENDING");

  const currentNodeIndex = stateOrder.indexOf(currentState as typeof stateOrder[number]);

  const nodes: TimelineNode[] = [
    {
      key: "PENDING",
      label: "Payment Initiated",
      description: "Awaiting payment confirmation",
      isCompleted:
        currentNodeIndex > 0 || currentState === "REFUNDED",
      isCurrent: currentState === "PENDING",
    },
    {
      key: "HELD",
      label: "Payment Held",
      description: "Funds secured in escrow",
      isCompleted: currentNodeIndex > 1 || currentState === "REFUNDED",
      isCurrent: currentState === "HELD",
    },
    {
      key: "IN_PROGRESS",
      label: "In Progress",
      description: "Provider is working on your project",
      isCompleted:
        currentNodeIndex > 2 &&
        currentState !== "DISPUTED" &&
        currentState !== "REFUNDED",
      isCurrent: currentState === "IN_PROGRESS",
    },
    {
      key: "RELEASED",
      label: "Completed",
      description: "Funds released to provider",
      isCompleted: currentState === "RELEASED",
      isCurrent: currentState === "RELEASED",
    },
  ];

  const isDisputed = currentState === "DISPUTED";
  const isRefunded = currentState === "REFUNDED";

  const timelineState = isDisputed
    ? ("disputed" as const)
    : isRefunded
      ? ("refunded" as const)
      : ("active" as const);

  const getNodeColor = (node: TimelineNode) => {
    if (timelineState === "disputed" && node.isCurrent) return "var(--color-escrow-disputed)";
    if (timelineState === "refunded" && node.key === "HELD") return "var(--color-escrow-disputed)";
    if (node.isCompleted) return "var(--color-success)";
    if (node.isCurrent) {
      if (node.key === "HELD") return "var(--color-escrow-held)";
      if (node.key === "IN_PROGRESS") return "var(--color-escrow-progress)";
      return "var(--color-accent)";
    }
    return "var(--color-border-mid)";
  };

  const renderNode = (node: TimelineNode, index: number) => {
    const color = getNodeColor(node);
    const isLast = index === nodes.length - 1;

    return (
      <div
        key={node.key}
        className={`flex ${isDesktop ? "flex-col items-center flex-1" : "items-start gap-4"}`}
      >
        <div className="flex flex-col items-center">
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 z-10 bg-[var(--color-bg)] ${node.isCurrent ? "animate-pulseDot" : ""}`}
            style={{ borderColor: color }}
          >
            {node.isCompleted && (
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke={color}
                strokeWidth="3"
              >
                <polyline points="20,6 9,17 4,12" />
              </svg>
            )}
            {node.isCurrent && !node.isCompleted && (
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: color }}
              />
            )}
          </div>
          {!isLast && (
            <div
              className={
                isDesktop
                  ? "w-full h-[2px] mt-[-1px]"
                  : "w-[2px] h-8 ml-[9px]"
              }
              style={{
                backgroundColor: node.isCompleted
                  ? "var(--color-success)"
                  : "var(--color-border-mid)",
              }}
            />
          )}
        </div>
        <div className={isDesktop ? "text-center mt-2" : "ml-3"}>
          <p
            className="text-[13px] font-medium"
            style={{ color: node.isCurrent ? color : "var(--color-text-primary)" }}
          >
            {node.label}
          </p>
          <p className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5">
            {node.description}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-[family-name:var(--font-display)] font-bold text-[16px] text-[var(--color-text-primary)]">
          Payment Timeline
        </h3>
        {countdown && (
          <span className="text-[12px] font-medium text-[var(--color-warning)] font-mono">
            {countdown}
          </span>
        )}
      </div>

      {isDisputed && (
        <div className="mb-4 p-3 rounded-[8px] bg-[rgba(248,113,113,0.1)] border border-[var(--color-escrow-disputed)]">
          <p className="text-[13px] font-medium text-[var(--color-escrow-disputed)]">
            Dispute Raised
          </p>
          <p className="text-[12px] text-[var(--color-text-secondary)] mt-1">
            An admin is reviewing this case.
          </p>
        </div>
      )}

      {isRefunded && (
        <div className="mb-4 p-3 rounded-[8px] bg-[rgba(248,113,113,0.1)] border border-[var(--color-escrow-disputed)]">
          <p className="text-[13px] font-medium text-[var(--color-escrow-disputed)]">
            Payment Refunded
          </p>
          <p className="text-[12px] text-[var(--color-text-secondary)] mt-1">
            Funds have been returned to the client.
          </p>
        </div>
      )}

      <div
        className={
          isDesktop
            ? "flex items-start justify-between"
            : "flex flex-col gap-2"
        }
      >
        {nodes.map((node, i) => renderNode(node, i))}
      </div>

      {viewerRole === "CLIENT" && currentState === "IN_PROGRESS" && (
        <div className="mt-5 pt-4 border-t border-[var(--color-border)] flex gap-3">
          <ClButton variant="primary" size="sm" onClick={onConfirmRelease}>
            Confirm Release
          </ClButton>
          <ClButton
            variant="outlined"
            size="sm"
            onClick={onRaiseDispute}
          >
            Raise Dispute
          </ClButton>
        </div>
      )}

      {viewerRole === "PROVIDER" && payment && (
        <div className="mt-5 pt-4 border-t border-[var(--color-border)]">
          <PayoutInfo payment={payment} />
        </div>
      )}
    </div>
  );
}

function PayoutInfo({ payment }: { payment: IPayment }) {
  return (
    <div>
      <p className="text-[12px] text-[var(--color-text-tertiary)] mb-1">
        Your Payout
      </p>
      <p className="font-[family-name:var(--font-display)] font-bold text-[24px] text-[var(--color-success)]">
        ₦{(payment.netAmount / 100).toLocaleString()}
      </p>
      <p className="text-[11px] text-[var(--color-text-tertiary)] mt-1">
        Fee: ₦{(payment.fee / 100).toLocaleString()}
      </p>
    </div>
  );
}

export { PayoutInfo };
