import Link from "next/link";
import { StatCard } from "./StatCard";
import { PipelineKanban } from "./PipelineKanban";
import { PaymentHistory } from "./PaymentHistory";
import { DiscoverCreators } from "./DiscoverCreators";
import type { IClientDashboard } from "@/types";

export function ClientDashboard({ data }: { data: IClientDashboard }) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="mx-auto max-w-[1200px] px-6 py-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-[24px] font-bold text-[var(--color-text-primary)]">
              Client Dashboard
            </h1>
            <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">
              Track your bookings and payments in one place.
            </p>
          </div>
          <Link
            href="/explore"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[var(--color-accent)] px-4 text-sm font-semibold text-[var(--color-text-inverse)] no-underline transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[var(--color-accent-dim)]"
          >
            Find Talent
          </Link>
        </div>

        {data.stats.length > 0 && (
          <div className="mb-8 grid grid-cols-3 max-[768px]:grid-cols-2 max-[640px]:grid-cols-1 gap-4">
            {data.stats.map((stat) => (
              <StatCard key={stat.label} stat={stat} />
            ))}
          </div>
        )}

        <div className="mb-6 overflow-hidden rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
            <h2 className="font-[family-name:var(--font-display)] text-[16px] font-bold text-[var(--color-text-primary)]">
              Your Bookings
            </h2>
            <Link
              href="/bookings"
              className="text-[13px] text-[var(--color-accent)] no-underline transition-colors duration-150 hover:underline"
            >
              View all →
            </Link>
          </div>
          <PipelineKanban columns={data.pipeline} side="client" />
        </div>

        <div className="mb-6 overflow-hidden rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
            <h2 className="font-[family-name:var(--font-display)] text-[16px] font-bold text-[var(--color-text-primary)]">
              Payment History
            </h2>
            <Link
              href="/wallet"
              className="text-[13px] text-[var(--color-accent)] no-underline transition-colors duration-150 hover:underline"
            >
              Wallet →
            </Link>
          </div>
          <PaymentHistory records={data.paymentHistory} />
        </div>

        <DiscoverCreators creators={data.discover} />
      </div>
    </div>
  );
}
