"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { usePlatformConfig } from "@/lib/config-context";
import {
  resolveBookingGuidance,
  type GuidanceContext,
  type GuidanceSide,
} from "@/lib/booking-guidance";

/**
 * "Who acts next?" banner for the booking detail page.
 *
 * Renders the config-driven guidance from `lib/booking-guidance.ts` for
 * states/sides that have NO bespoke action panel (see BookingDetailClient —
 * the banner is passed an explicit `show` decision there so it never
 * duplicates a panel). Fully config-driven: `config.bookingFlow.enabled`
 * toggles it, and `${status}:${side}` copy overrides (including empty-string
 * hide) resolve through `resolveBookingGuidance`.
 */
export interface NextStepBannerProps {
  status: string;
  side: GuidanceSide;
  ctx?: GuidanceContext;
}

const toneStyles = {
  info: {
    border: "var(--color-border)",
    bg: "var(--color-surface)",
    icon: "var(--color-info)",
    Icon: Info,
  },
  success: {
    border: "var(--color-success)",
    bg: "rgba(74,222,128,0.06)",
    icon: "var(--color-success)",
    Icon: CheckCircle2,
  },
  warning: {
    border: "var(--color-warning)",
    bg: "rgba(250,204,21,0.06)",
    icon: "var(--color-warning)",
    Icon: AlertTriangle,
  },
} as const;

export function NextStepBanner({ status, side, ctx }: NextStepBannerProps) {
  const config = usePlatformConfig();
  const guidance = resolveBookingGuidance(status, side, config, ctx);
  if (!guidance) return null;

  const tone = toneStyles[guidance.tone];
  const ToneIcon = tone.Icon;

  return (
    <div
      className="mt-5 rounded-[12px] border p-4"
      style={{ borderColor: tone.border, backgroundColor: tone.bg }}
    >
      <div className="flex items-start gap-2.5">
        <ToneIcon size={16} strokeWidth={2} className="mt-0.5 shrink-0" style={{ color: tone.icon }} aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-[var(--color-text-primary)]">
            {guidance.title}
          </p>
          <p className="text-[13px] text-[var(--color-text-secondary)] mt-1">
            {guidance.description}
          </p>
          {guidance.cta && (
            <Link
              href={guidance.cta.href}
              className="inline-flex items-center gap-1 mt-2.5 text-[13px] font-medium text-[var(--color-accent)] hover:underline"
            >
              {guidance.cta.label}
              <ArrowRight size={13} strokeWidth={2.5} aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
