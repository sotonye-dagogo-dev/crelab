"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Info, Medal, Trophy, UserRound } from "lucide-react";
import {
  ClBadge,
  ClButton,
  ClDataTable,
  ClEmptyState,
  ClPagination,
  ClSpinner,
  type ClColumn,
} from "@/components/ui";
import { usePlatformConfig } from "@/lib/config-context";
import type { LeaderboardPage } from "@/services/LeaderboardService";
import type { ILeaderboardRow } from "@/types";

function formatNumber(value: number): string {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

const MEDAL_COLORS = [
  "text-[#f5c518]", // gold
  "text-[#c0c7d1]", // silver
  "text-[#cd7f32]", // bronze
];

/**
 * Public leaderboard: podium + paginated table + the F7 "How scoring works"
 * transparency panel. Privacy: rows render display name and avatar only —
 * never emails, never ids in URLs.
 */
export function LeaderboardClient({ pageSize }: { pageSize: number }) {
  const config = usePlatformConfig();
  const leaderboard = config.leaderboard;

  const [page, setPage] = useState(1);
  const [data, setData] = useState<LeaderboardPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(
    async (targetPage: number) => {
      setLoading(true);
      setFailed(false);
      try {
        const res = await fetch(
          `/api/leaderboard?page=${targetPage}&pageSize=${encodeURIComponent(pageSize)}`,
        );
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.success) throw new Error("leaderboard request failed");
        setData(json.data as LeaderboardPage);
      } catch {
        setFailed(true);
      } finally {
        setLoading(false);
      }
    },
    [pageSize],
  );

  useEffect(() => {
    load(page);
  }, [page, load]);

  // Config rows are the fallback before the first response lands; the API's
  // list is authoritative once it arrives (it drops unimplemented factors).
  const factors = useMemo(() => {
    if (data?.factors?.length) return data.factors;
    return Object.values(leaderboard?.factors ?? {}).filter((factor) => factor.enabled);
  }, [data, leaderboard]);

  const columns = useMemo<ClColumn<ILeaderboardRow>[]>(() => {
    // Only factors that opted into raw visibility get a column — the referrals
    // factor (showRawValue: false) contributes to the score but never shows
    // its unscaled value.
    const factorColumns: ClColumn<ILeaderboardRow>[] = factors
      .filter((factor) => factor.showRawValue)
      .map((factor) => ({
        key: `factor-${factor.key}`,
        header: factor.label,
        hideOnMobile: true,
        cell: (row) => (
          <div className="flex flex-col leading-tight">
            <span className="font-semibold text-[var(--color-text-primary)]">
              {formatNumber(row.breakdown?.[factor.key] ?? 0)}
            </span>
            {typeof row.rawValues?.[factor.key] === "number" && (
              <span className="text-[11px] text-[var(--color-text-tertiary)]">
                {formatNumber(row.rawValues[factor.key])} raw
              </span>
            )}
          </div>
        ),
      }));

    return [
      {
        key: "rank",
        header: "#",
        width: "w-[56px]",
        cell: (row) => (
          <span className="font-[family-name:var(--font-display)] font-bold text-[13px] text-[var(--color-text-secondary)]">
            {row.rank}
          </span>
        ),
      },
      {
        key: "member",
        header: "Member",
        cell: (row) => (
          <div className="flex items-center gap-2 min-w-0">
            {row.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={row.avatarUrl}
                alt=""
                className="w-7 h-7 rounded-full object-cover shrink-0 border border-[var(--color-border)]"
              />
            ) : (
              <span className="w-7 h-7 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-center shrink-0 text-[var(--color-text-tertiary)]">
                <UserRound size={14} strokeWidth={2} />
              </span>
            )}
            <span className="truncate font-semibold text-[var(--color-text-primary)]">
              {row.displayName}
            </span>
            {row.isCurrentUser && (
              <ClBadge variant="accent" className="shrink-0">
                You
              </ClBadge>
            )}
          </div>
        ),
      },
      {
        key: "score",
        header: "Score",
        cell: (row) => (
          <span className="font-bold text-[var(--color-text-primary)]">{formatNumber(row.score)}</span>
        ),
      },
      ...factorColumns,
    ];
  }, [factors]);

  const rows = data?.rows ?? [];
  const podium = page === 1 ? rows.slice(0, 3) : [];

  if (config.features?.referralsEnabled === false || leaderboard?.enabled === false) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-[1040px] mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Trophy size={22} strokeWidth={2} className="text-[var(--color-accent)]" />
            <h1 className="font-[family-name:var(--font-display)] font-bold text-[26px] tracking-[-0.01em] text-[var(--color-text-primary)]">
              {leaderboard?.title || "Leaderboard"}
            </h1>
          </div>
          <p className="text-[14px] text-[var(--color-text-secondary)] leading-relaxed max-w-[680px]">
            {leaderboard?.subtitle ||
              "The most active creators and connectors on the platform, ranked by weighted score."}
          </p>
        </div>

        {loading && !data && (
          <div className="flex items-center justify-center py-20">
            <ClSpinner />
          </div>
        )}

        {failed && !data && (
          <ClEmptyState
            title="Couldn't load the leaderboard"
            message="Something went wrong while fetching the rankings."
            action={{ label: "Try again", onClick: () => load(page) }}
          />
        )}

        {data && (
          <div className={`flex flex-col gap-6 transition-opacity ${loading ? "opacity-60" : ""}`}>
            {podium.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {podium.map((row, index) => (
                  <div
                    key={row.userId}
                    className={`rounded-[12px] border bg-[var(--color-surface)] p-4 flex flex-col items-center text-center gap-2 ${
                      index === 0
                        ? "border-[var(--color-accent)] sm:order-2"
                        : "border-[var(--color-border)]"
                    } ${index === 1 ? "sm:order-1" : ""} ${index === 2 ? "sm:order-3" : ""}`}
                  >
                    <Medal size={20} strokeWidth={2} className={MEDAL_COLORS[index] ?? ""} />
                    {row.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.avatarUrl}
                        alt=""
                        className={`rounded-full object-cover border border-[var(--color-border)] ${
                          index === 0 ? "w-14 h-14" : "w-11 h-11"
                        }`}
                      />
                    ) : (
                      <span
                        className={`rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-tertiary)] ${
                          index === 0 ? "w-14 h-14" : "w-11 h-11"
                        }`}
                      >
                        <UserRound size={index === 0 ? 22 : 18} strokeWidth={2} />
                      </span>
                    )}
                    <span className="font-semibold text-[14px] text-[var(--color-text-primary)] truncate max-w-full">
                      {row.displayName}
                    </span>
                    <span className="text-[12px] text-[var(--color-text-tertiary)]">
                      Rank #{row.rank} ·{" "}
                      <span className="font-bold text-[var(--color-text-primary)]">
                        {formatNumber(row.score)}
                      </span>{" "}
                      pts
                    </span>
                    {row.isCurrentUser && <ClBadge variant="accent">You</ClBadge>}
                  </div>
                ))}
              </div>
            )}

            <ClDataTable
              columns={columns}
              rows={rows}
              rowKey={(row) => row.userId}
              emptyState={
                <ClEmptyState
                  title="No activity yet"
                  message="The board fills up as members invite friends, publish work and get booked."
                  className="py-10"
                />
              }
            />

            <ClPagination
              page={data.page}
              totalPages={data.totalPages}
              onPageChange={setPage}
              pageSize={data.pageSize}
              totalItems={data.total}
              className="justify-between"
            />

            <section className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Info size={15} strokeWidth={2} className="text-[var(--color-accent)]" />
                <h2 className="font-[family-name:var(--font-display)] font-bold text-[17px] text-[var(--color-text-primary)]">
                  {leaderboard?.howItWorksTitle || "How scoring works"}
                </h2>
              </div>

              <div className="flex flex-col gap-4">
                {factors.map((factor) => (
                  <div key={factor.key} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[13px] text-[var(--color-text-primary)]">
                        {factor.label}
                      </span>
                      <ClBadge variant="default">weight ×{formatNumber(factor.weight)}</ClBadge>
                      {factor.showRawValue ? (
                        <ClBadge variant="info">raw value shown</ClBadge>
                      ) : (
                        <ClBadge variant="default">raw value hidden</ClBadge>
                      )}
                    </div>
                    <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
                      {factor.description}
                    </p>
                  </div>
                ))}
              </div>

              <p className="text-[12px] text-[var(--color-text-tertiary)] leading-relaxed mt-4 pt-4 border-t border-[var(--color-border)]">
                Each factor&apos;s raw value is multiplied by its weight and the results are added up
                to form the score; higher scores rank higher. Disabled factors don&apos;t count. Only
                public profile details — display name and avatar — appear on this board.
              </p>
            </section>

            <div className="flex justify-center">
              <ClButton variant="outlined" size="sm" onClick={() => load(page)} disabled={loading}>
                Refresh
              </ClButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
