import Link from "next/link";
import { CompletenessBar } from "./CompletenessBar";
import { StatCard } from "./StatCard";
import { PipelineKanban } from "./PipelineKanban";
import { AvailabilityCalendar } from "./AvailabilityCalendar";
import { PortfolioPerformanceTable } from "./PortfolioPerformanceTable";
import type { IProviderDashboard } from "@/types";

export function ProviderDashboard({ data }: { data: IProviderDashboard }) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="mx-auto max-w-[1200px] px-6 py-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-[24px] font-bold text-[var(--color-text-primary)]">
              Provider Dashboard
            </h1>
            {data.profile && (
              <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">
                {data.profile.displayName} · {data.profile.categoryLabel}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/profile"
              className="text-[13px] text-[var(--color-accent)] no-underline transition-colors duration-150 hover:underline"
            >
              Account settings →
            </Link>
            <Link
              href={data.profile ? `/profile/${data.profile.id}` : "/explore"}
              className="text-[13px] text-[var(--color-accent)] no-underline transition-colors duration-150 hover:underline"
            >
              View public profile →
            </Link>
          </div>
        </div>

        {data.profile && <CompletenessBar completeness={data.completeness} />}

        {data.stats.length > 0 && (
          <div className="mb-8 grid grid-cols-4 max-[900px]:grid-cols-2 max-[480px]:grid-cols-1 gap-4">
            {data.stats.map((stat) => (
              <StatCard key={stat.label} stat={stat} />
            ))}
          </div>
        )}

        <div className="mb-6 overflow-hidden rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
            <h2 className="font-[family-name:var(--font-display)] text-[16px] font-bold text-[var(--color-text-primary)]">
              Booking Pipeline
            </h2>
            <Link
              href="/bookings"
              className="text-[13px] text-[var(--color-accent)] no-underline transition-colors duration-150 hover:underline"
            >
              View all →
            </Link>
          </div>
          <PipelineKanban columns={data.pipeline} side="provider" />
        </div>

        {data.availability.length > 0 && (
          <div className="mb-6 overflow-hidden rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
              <h2 className="font-[family-name:var(--font-display)] text-[16px] font-bold text-[var(--color-text-primary)]">
                Availability
              </h2>
              <span className="text-[12px] text-[var(--color-text-tertiary)]">
                Bookings block a day
              </span>
            </div>
            <div className="p-4 max-[480px]:px-5">
              <AvailabilityCalendar slots={data.availability} />
            </div>
          </div>
        )}

        <div className="mb-6 overflow-hidden rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
            <h2 className="font-[family-name:var(--font-display)] text-[16px] font-bold text-[var(--color-text-primary)]">
              Portfolio Performance
            </h2>
            <Link
              href="/profile/edit"
              className="text-[13px] text-[var(--color-accent)] no-underline transition-colors duration-150 hover:underline"
            >
              Manage portfolio →
            </Link>
          </div>
          <PortfolioPerformanceTable rows={data.portfolioPerformance} />
        </div>

        {data.quickActions.length > 0 && (
          <div className="flex flex-wrap gap-3 max-[480px]:flex-col">
            {data.quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className={
                  action.variant === "primary"
                    ? "inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[var(--color-accent)] px-4 text-sm font-semibold text-[var(--color-text-inverse)] no-underline transition-colors duration-150 hover:bg-[var(--color-accent-dim)] max-[480px]:w-full"
                    : action.variant === "accent-outlined"
                      ? "inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[var(--color-accent)] bg-transparent px-4 text-sm font-semibold text-[var(--color-accent)] no-underline transition-colors duration-150 hover:bg-[var(--color-accent-muted)] max-[480px]:w-full"
                      : "inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-transparent px-4 text-sm font-semibold text-[var(--color-text-secondary)] no-underline transition-colors duration-150 hover:text-[var(--color-text-primary)] max-[480px]:w-full"
                }
              >
                {action.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
