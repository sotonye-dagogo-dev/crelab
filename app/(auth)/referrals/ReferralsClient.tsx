"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Coins, Copy, Network, Trophy, UserPlus, Users } from "lucide-react";
import { ClBackButton, ClBadge, ClButton, ClCard, ClSpinner } from "@/components/ui";
import { EarlyMemberBadge } from "@/components/shared/EarlyMemberBadge";
import { usePlatformConfig } from "@/lib/config-context";
import { useToast } from "@/lib/toast";
import type { IReferralSummary } from "@/types";

type ReferralsState =
  | { kind: "loading" }
  | { kind: "ready"; summary: IReferralSummary }
  | { kind: "unauthorized" }
  | { kind: "error" };

export function ReferralsClient({ initialSummary }: { initialSummary: IReferralSummary | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const config = usePlatformConfig();
  const referral = config.referral;

  const [state, setState] = useState<ReferralsState>(
    initialSummary ? { kind: "ready", summary: initialSummary } : { kind: "loading" },
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialSummary) return;
    let cancelled = false;

    fetch("/api/referrals/me")
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) {
          setState({ kind: "unauthorized" });
          return;
        }
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.success) {
          setState({ kind: "error" });
          return;
        }
        setState({ kind: "ready", summary: json.data as IReferralSummary });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [initialSummary]);

  const shareUrl = state.kind === "ready" ? state.summary.shareUrl : "";

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Could not copy — select the link and copy it manually.", "error");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-[720px] mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <ClBackButton href="/dashboard" label="Back to dashboard" className="mb-6" />

        <div className="mb-8">
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <h1 className="font-[family-name:var(--font-display)] font-bold text-[26px] tracking-[-0.01em] text-[var(--color-text-primary)]">
              {referral?.heroTitle || "Invite & earn"}
            </h1>
            <EarlyMemberBadge />
          </div>
          <p className="text-[14px] text-[var(--color-text-secondary)] leading-relaxed">
            {referral?.heroSubtitle ||
              "Share your invite link, earn points when friends join — and earn again when they invite their own friends."}
          </p>
        </div>

        {state.kind === "loading" && (
          <div className="flex items-center justify-center py-16">
            <ClSpinner />
          </div>
        )}

        {state.kind === "unauthorized" && (
          <ClCard className="p-6 text-center">
            <p className="text-[14px] text-[var(--color-text-secondary)] mb-4">
              Sign in to get your invite link and start earning referral points.
            </p>
            <ClButton variant="primary" onClick={() => router.push("/login")}>
              Sign in
            </ClButton>
          </ClCard>
        )}

        {state.kind === "error" && (
          <ClCard className="p-6 text-center">
            <p className="text-[14px] text-[var(--color-text-secondary)]">
              We couldn&apos;t load your referral summary right now. Please refresh the page.
            </p>
          </ClCard>
        )}

        {state.kind === "ready" && (
          <div className="flex flex-col gap-5">
            <ClCard className="p-5 sm:p-6">
              <p className="font-semibold text-xs text-[var(--color-text-secondary)] uppercase tracking-[0.06em] mb-3">
                {referral?.shareLabel || "Copy invite link"}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  readOnly
                  value={shareUrl}
                  onFocus={(e) => e.target.select()}
                  aria-label="Your invite link"
                  className="flex-1 h-10 px-3 rounded-[8px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[13px] text-[var(--color-text-primary)] outline-none min-w-0 focus:border-[var(--color-accent)]"
                />
                <ClButton variant="primary" onClick={handleCopy} disabled={!shareUrl}>
                  {copied ? (
                    <>
                      <Check size={14} strokeWidth={2} />
                      {referral?.copiedLabel || "Link copied"}
                    </>
                  ) : (
                    <>
                      <Copy size={14} strokeWidth={2} />
                      {referral?.shareLabel || "Copy invite link"}
                    </>
                  )}
                </ClButton>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
                <StatTile
                  icon={<Coins size={15} strokeWidth={2} />}
                  value={state.summary.totalPoints}
                  label="Points earned"
                />
                <StatTile
                  icon={<UserPlus size={15} strokeWidth={2} />}
                  value={state.summary.directReferrals}
                  label="Direct referrals"
                />
                <StatTile
                  icon={<Users size={15} strokeWidth={2} />}
                  value={state.summary.secondDegreeReferrals}
                  label="Second degree"
                />
                <StatTile
                  icon={<Network size={15} strokeWidth={2} />}
                  value={state.summary.inviteeCount}
                  label="People in your network"
                />
              </div>

              {config.leaderboard?.enabled !== false && (
                <div className="mt-5 pt-4 border-t border-[var(--color-border)]">
                  <ClButton variant="accent-outlined" onClick={() => router.push("/leaderboard")}>
                    <Trophy size={14} strokeWidth={2} /> View leaderboard
                  </ClButton>
                </div>
              )}
            </ClCard>

            <ClCard className="p-5 sm:p-6">
              <p className="font-[family-name:var(--font-display)] font-bold text-[17px] text-[var(--color-text-primary)] mb-4">
                {referral?.explainerTitle || "How it works"}
              </p>
              <ol className="flex flex-col gap-3">
                {(referral?.explainerItems && referral.explainerItems.length > 0
                  ? referral.explainerItems
                  : [
                      "Share your unique invite link with a friend.",
                      "They sign up with your link and you earn direct-referral points.",
                      "When they invite someone else, you earn second-degree points too.",
                      "Your points decide your place on the leaderboard.",
                    ]
                ).map((item, index) => (
                  <li key={index} className="flex gap-3 items-start">
                    <ClBadge variant="accent" className="mt-[1px] shrink-0">
                      {index + 1}
                    </ClBadge>
                    <span className="text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
                      {item}
                    </span>
                  </li>
                ))}
              </ol>
            </ClCard>
          </div>
        )}
      </div>
    </div>
  );
}

function StatTile({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3">
      <div className="flex items-center gap-2 text-[var(--color-accent)] mb-1">{icon}</div>
      <div className="font-[family-name:var(--font-display)] font-bold text-[20px] text-[var(--color-text-primary)] leading-none">
        {value}
      </div>
      <div className="text-[11px] text-[var(--color-text-tertiary)] mt-1">{label}</div>
    </div>
  );
}
