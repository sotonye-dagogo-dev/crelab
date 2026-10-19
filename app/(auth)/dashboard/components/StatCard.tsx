"use client";

import { ClInfoTip } from "@/components/ui";
import { usePlatformConfig } from "@/lib/config-context";
import { resolveHint, type HintKey } from "@/lib/hints";
import type { IDashboardStat, DashboardStatTone } from "@/types";

const toneStyles: Record<DashboardStatTone, string> = {
  success: "text-[var(--color-success)]",
  warning: "text-[var(--color-warning)]",
  accent: "text-[var(--color-accent)]",
  held: "text-[var(--color-escrow-held)]",
  tertiary: "text-[var(--color-text-tertiary)]",
};

/** Hint keys this component knows how to resolve (guards against typos in
 *  service-provided hintKey values — unknown keys render no tip). */
const KNOWN_HINT_KEYS = new Set(["dashboardEscrow"]);

export function StatCard({ stat }: { stat: IDashboardStat }) {
  const platformConfig = usePlatformConfig();
  const hint =
    stat.hintKey && KNOWN_HINT_KEYS.has(stat.hintKey)
      ? resolveHint(stat.hintKey as HintKey, platformConfig)
      : null;

  return (
    <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-[var(--color-border-mid)]">
      <div
        className="text-[1.875rem] font-bold leading-[1.2] text-[var(--color-text-primary)] tabular-nums"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {stat.value}
      </div>
      <div className="mt-1 inline-flex items-center gap-1.5 font-[family-name:var(--font-body)] text-[13px] text-[var(--color-text-secondary)]">
        {stat.label}
        {hint && (
          <ClInfoTip label={`About ${stat.label}`}>
            {hint}
          </ClInfoTip>
        )}
      </div>
      {stat.sub && (
        <div
          className={`mt-2 text-[12px] ${
            stat.subTone ? toneStyles[stat.subTone] : "text-[var(--color-text-tertiary)]"
          }`}
        >
          {stat.sub}
        </div>
      )}
    </div>
  );
}
