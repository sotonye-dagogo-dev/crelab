"use client";

import { useEffect, useState } from "react";
import { Crown } from "lucide-react";
import { ClBadge } from "@/components/ui";
import { usePlatformConfig } from "@/lib/config-context";

interface EarlyMemberRank {
  isTop100: boolean;
  rank: number | null;
}

/**
 * Founding-100 badge (`ClBadge` + Crown). Renders nothing when the
 * `firstHundred` flag is off — and in that case never fetches status.
 * Used in the profile header and on `/referrals`.
 */
export function EarlyMemberBadge({
  className = "",
  showRank,
}: {
  className?: string;
  /** Override `firstHundred.showRank` for this call site */
  showRank?: boolean;
}) {
  const config = usePlatformConfig();
  const firstHundred = config.firstHundred;
  const enabled = firstHundred?.enabled === true;

  const [status, setStatus] = useState<EarlyMemberRank | null>(null);

  useEffect(() => {
    if (!enabled) {
      setStatus(null);
      return;
    }
    let cancelled = false;
    fetch("/api/early-access")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return;
        const data = json?.data as EarlyMemberRank | undefined;
        if (data && data.isTop100) setStatus(data);
      })
      .catch(() => {
        /* status is decorative — never block the UI */
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  if (!enabled || !firstHundred || !status?.isTop100) return null;

  const withRank = showRank ?? firstHundred.showRank;
  const rankLabel = withRank && status.rank ? ` · #${status.rank}` : "";

  return (
    <ClBadge
      variant="accent"
      className={className}
      title={`${firstHundred.title} — ${firstHundred.description}`}
    >
      <Crown size={11} strokeWidth={2} className="mr-1 shrink-0" />
      {firstHundred.badgeLabel}
      {rankLabel}
    </ClBadge>
  );
}
