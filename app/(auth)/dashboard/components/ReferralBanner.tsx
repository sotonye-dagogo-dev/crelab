"use client";

import Link from "next/link";
import { UserPlus } from "lucide-react";
import { usePlatformConfig } from "@/lib/config-context";

/**
 * Growth banner linking to the invite programme. Renders nothing when the
 * referral programme is switched off (`features.referralsEnabled` or
 * `referral.enabled`).
 */
export function ReferralBanner() {
  const config = usePlatformConfig();
  if (
    config.features?.referralsEnabled === false ||
    config.referral?.enabled === false
  ) {
    return null;
  }

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[var(--color-accent-muted)] text-[var(--color-accent)]">
          <UserPlus size={18} strokeWidth={2} />
        </span>
        <div>
          <p className="font-[family-name:var(--font-display)] text-[15px] font-bold text-[var(--color-text-primary)]">
            {config.referral?.heroTitle || "Invite & earn"}
          </p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
            {config.referral?.heroSubtitle ||
              "Share your invite link, earn points when friends join — and earn again when they invite their own friends."}
          </p>
        </div>
      </div>
      <Link
        href="/referrals"
        className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[8px] bg-[var(--color-accent)] px-4 text-sm font-semibold text-[var(--color-text-inverse)] no-underline transition-colors duration-150 hover:bg-[var(--color-accent-dim)]"
      >
        Get invite link
      </Link>
    </div>
  );
}
