"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClButton, ClCard, ClDataTable, type ClColumn } from "@/components/ui";
import { BarList, DonutChart, LineChart } from "@/components/admin/AnalyticsCharts";
import { transactionsToCsv } from "@/lib/finance";
import { useToast } from "@/lib/toast";
import { ArrowDownRight, ArrowUpRight, Download, Lightbulb, Minus, RotateCcw, TrendingUp } from "lucide-react";

interface IKpi {
  key: string;
  label: string;
  value: string;
  rawValue: number;
  delta: number | null;
  goodWhenUp: boolean;
}

interface IOverview {
  rangeDays: number;
  from: string;
  to: string;
  kpis: IKpi[];
  series: {
    bookingsPerDay: { day: string; value: number }[];
    bookingsTrend: { day: string; value: number }[];
    gmvPerDayKobo: { day: string; value: number }[];
    gmvTrendKobo: { day: string; value: number }[];
    signupsPerDay: { day: string; value: number }[];
    revenuePerDayKobo: { day: string; value: number }[];
  };
  breakdowns: {
    bookingsByStatus: { key: string; label: string; value: number }[];
    revenueByCategoryKobo: { key: string; label: string; value: number }[];
    usersByRole: { key: string; label: string; value: number }[];
  };
  topProviders: { providerId: string; displayName: string; categorySlug: string; bookings: number; gmvKobo: number; avgRating: number | null }[];
  platform: Record<string, number>;
  insights: { tone: "success" | "warning" | "danger" | "info"; title: string; body: string }[];
  totals: { bookings: number; bookingsPrev: number; gmvKobo: number; gmvPrevKobo: number; signups: number; signupsPrev: number };
}

const RANGES = [7, 30, 90, 365];
const koboShort = (n: number) => `₦${Math.round(n / 100).toLocaleString("en-NG")}`;

function DeltaBadge({ delta, goodWhenUp }: { delta: number | null; goodWhenUp: boolean }) {
  if (delta === null) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-[var(--color-text-tertiary)]" title="No prior-period data to compare against">
        <Minus size={12} strokeWidth={2} /> n/a
      </span>
    );
  }
  const up = delta > 0.005;
  const down = delta < -0.005;
  const good = (up && goodWhenUp) || (down && !goodWhenUp);
  const bad = (down && goodWhenUp) || (up && !goodWhenUp);
  const cls = good ? "text-emerald-500" : bad ? "text-[var(--color-error)]" : "text-[var(--color-text-tertiary)]";
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;
  const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${cls}`} title="Change vs the preceding period of the same length">
      <Icon size={12} strokeWidth={2.5} />
      {sign}{(Math.abs(delta) * 100).toFixed(1)}%
    </span>
  );
}

const toneStyles: Record<string, string> = {
  success: "border-emerald-500/40 bg-emerald-500/5",
  warning: "border-amber-500/40 bg-amber-500/5",
  danger: "border-[var(--color-error)]/40 bg-[var(--color-error)]/5",
  info: "border-[var(--color-border-mid)] bg-[var(--color-surface-raised)]",
};

export default function AdminAnalyticsPage() {
  const { toast } = useToast();
  const [range, setRange] = useState(30);
  const [showTrend, setShowTrend] = useState(true);

  const { data, isLoading, isError, refetch, isFetching } = useQuery<IOverview>({
    queryKey: ["admin-analytics", range],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics?range=${range}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load analytics");
      return json.data;
    },
  });

  const exportSeries = (name: string, rows: { day: string; value: number }[]) => {
    if (rows.length === 0) {
      toast("Nothing to export for this series", "error");
      return;
    }
    const csv = transactionsToCsv(rows as unknown as Record<string, unknown>[], ["day", "value"]);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}-${range}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`${name} exported as CSV`, "success");
  };

  const topColumns: ClColumn<IOverview["topProviders"][number]>[] = useMemo(
    () => [
      {
        key: "provider",
        header: "Provider",
        cell: (r) => (
          <div className="min-w-0">
            <div className="text-[13px] font-semibold truncate">{r.displayName}</div>
            <div className="text-[11px] text-[var(--color-text-tertiary)] truncate">{r.categorySlug || "—"}</div>
          </div>
        ),
      },
      {
        key: "bookings",
        header: "Bookings",
        cell: (r) => <span className="text-[12px] font-[family-name:var(--font-mono)]">{r.bookings}</span>,
      },
      {
        key: "gmv",
        header: "GMV",
        cell: (r) => <span className="text-[12px] font-bold font-[family-name:var(--font-mono)] text-[var(--color-accent)]">{koboShort(r.gmvKobo)}</span>,
      },
      {
        key: "rating",
        header: "Avg rating",
        cell: (r) => <span className="text-[12px] font-[family-name:var(--font-mono)]">{r.avgRating !== null ? r.avgRating.toFixed(1) : "—"}</span>,
      },
    ],
    [],
  );

  const platformEntries = useMemo(() => {
    const p = data?.platform ?? {};
    const labels: Record<string, string> = {
      payments: "Payments (lifetime)",
      disputes: "Disputes (lifetime)",
      visiblePortfolioItems: "Visible portfolio items",
      referralEvents: "Referral events",
      activeWebinars: "Active webinars",
      webinarRegistrations: "Webinar registrations",
    };
    return Object.entries(labels).map(([key, label]) => ({ key, label, value: Number(p[key] ?? 0) }));
  }, [data]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] font-bold text-[22px] tracking-[-0.01em]">Platform Analytics</h2>
          <div className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">
            Demand, revenue, growth and health — every figure compares against the preceding {range}-day window.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-[8px] border border-[var(--color-border-mid)] overflow-hidden" role="tablist" aria-label="Time range">
            {RANGES.map((r) => (
              <button
                key={r}
                role="tab"
                aria-selected={range === r}
                onClick={() => setRange(r)}
                className={`h-9 px-3 text-[12px] font-semibold cursor-pointer border-none transition-colors ${
                  range === r ? "bg-[var(--color-accent)] text-[#0A0A0A]" : "bg-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {r}d
              </button>
            ))}
          </div>
          <ClButton variant="ghost" size="default" onClick={() => refetch()} loading={isFetching}>
            <RotateCcw size={14} strokeWidth={2} className="mr-1.5" />
            Refresh
          </ClButton>
        </div>
      </div>

      {isError ? (
        <div className="text-[13px] text-[var(--color-error)]">Failed to load analytics. Check the connection and retry.</div>
      ) : isLoading ? (
        <div className="text-[var(--color-text-secondary)] text-[14px]">Loading analytics...</div>
      ) : data ? (
        <div className="flex flex-col gap-4">
          {/* KPI grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {data.kpis.map((k) => (
              <ClCard
                key={k.key}
                className="p-4"
              >
                <div className="text-[11px] uppercase tracking-[0.06em] text-[var(--color-text-tertiary)] font-semibold truncate" title={k.label}>{k.label}</div>
                <div className="text-[20px] font-bold font-[family-name:var(--font-mono)] mt-1 truncate" title={k.value}>{k.value}</div>
                <div className="mt-1"><DeltaBadge delta={k.delta} goodWhenUp={k.goodWhenUp} /></div>
              </ClCard>
            ))}
          </div>

          {/* Trend charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ClCard className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-[14px] font-bold flex items-center gap-1.5"><TrendingUp size={15} strokeWidth={2} /> Bookings per day</div>
                  <div className="text-[11px] text-[var(--color-text-tertiary)]">Daily volume with 7-day moving average</div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-secondary)] cursor-pointer">
                    <input type="checkbox" checked={showTrend} onChange={(e) => setShowTrend(e.target.checked)} className="accent-[var(--color-accent)]" />
                    Trend
                  </label>
                  <button onClick={() => exportSeries("bookings-per-day", data.series.bookingsPerDay)} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] cursor-pointer bg-transparent border-none" title="Export as CSV" aria-label="Export bookings series">
                    <Download size={14} strokeWidth={2} />
                  </button>
                </div>
              </div>
              <LineChart data={showTrend ? data.series.bookingsTrend : data.series.bookingsPerDay} formatValue={(v, day) => `${v} bookings · ${day}`} />
            </ClCard>
            <ClCard className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-[14px] font-bold">GMV per day</div>
                  <div className="text-[11px] text-[var(--color-text-tertiary)]">Gross booking value with 7-day moving average</div>
                </div>
                <button onClick={() => exportSeries("gmv-per-day", data.series.gmvPerDayKobo)} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] cursor-pointer bg-transparent border-none" title="Export as CSV" aria-label="Export GMV series">
                  <Download size={14} strokeWidth={2} />
                </button>
              </div>
              <LineChart data={showTrend ? data.series.gmvTrendKobo : data.series.gmvPerDayKobo} formatValue={(v, day) => `${koboShort(v)} · ${day}`} accent="#7DD3FC" />
            </ClCard>
            <ClCard className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-[14px] font-bold">Signups per day</div>
                  <div className="text-[11px] text-[var(--color-text-tertiary)]">New member acquisition</div>
                </div>
                <button onClick={() => exportSeries("signups-per-day", data.series.signupsPerDay)} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] cursor-pointer bg-transparent border-none" title="Export as CSV" aria-label="Export signups series">
                  <Download size={14} strokeWidth={2} />
                </button>
              </div>
              <LineChart data={data.series.signupsPerDay} formatValue={(v, day) => `${v} signups · ${day}`} accent="#86EFAC" />
            </ClCard>
            <ClCard className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-[14px] font-bold">Platform fees per day</div>
                  <div className="text-[11px] text-[var(--color-text-tertiary)]">Take-home revenue trend</div>
                </div>
                <button onClick={() => exportSeries("fees-per-day", data.series.revenuePerDayKobo)} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] cursor-pointer bg-transparent border-none" title="Export as CSV" aria-label="Export fees series">
                  <Download size={14} strokeWidth={2} />
                </button>
              </div>
              <LineChart data={data.series.revenuePerDayKobo} formatValue={(v, day) => `${koboShort(v)} · ${day}`} accent="#F0ABFC" />
            </ClCard>
          </div>

          {/* Breakdowns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ClCard className="p-4">
              <div className="text-[14px] font-bold mb-1">Bookings by status</div>
              <div className="text-[11px] text-[var(--color-text-tertiary)] mb-3">Where demand sits in the pipeline</div>
              <DonutChart data={data.breakdowns.bookingsByStatus} formatValue={(v) => `${v} bookings`} />
            </ClCard>
            <ClCard className="p-4">
              <div className="text-[14px] font-bold mb-1">Revenue by category</div>
              <div className="text-[11px] text-[var(--color-text-tertiary)] mb-3">Which segments drive GMV</div>
              <BarList data={data.breakdowns.revenueByCategoryKobo} formatValue={koboShort} money />
            </ClCard>
            <ClCard className="p-4">
              <div className="text-[14px] font-bold mb-1">Members by role</div>
              <div className="text-[11px] text-[var(--color-text-tertiary)] mb-3">Supply vs demand composition</div>
              <BarList data={data.breakdowns.usersByRole} formatValue={(v) => String(v)} />
            </ClCard>
          </div>

          {/* Insights + top providers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ClCard className="p-4">
              <div className="text-[14px] font-bold mb-1 flex items-center gap-1.5"><Lightbulb size={15} strokeWidth={2} /> What the data says</div>
              <div className="text-[11px] text-[var(--color-text-tertiary)] mb-3">Auto-generated commentary from this period&apos;s figures</div>
              <div className="flex flex-col gap-2.5">
                {data.insights.map((ins, i) => (
                  <div key={i} className={`rounded-[10px] border p-3 ${toneStyles[ins.tone] ?? toneStyles.info}`}>
                    <div className="text-[13px] font-semibold">{ins.title}</div>
                    <div className="text-[12px] text-[var(--color-text-secondary)] mt-0.5 leading-relaxed">{ins.body}</div>
                  </div>
                ))}
              </div>
            </ClCard>
            <div className="flex flex-col gap-4">
              <ClCard className="p-4">
                <div className="text-[14px] font-bold mb-1">Top providers by GMV</div>
                <div className="text-[11px] text-[var(--color-text-tertiary)] mb-3">Lifetime ranking — who drives the marketplace</div>
                <ClDataTable
                  columns={topColumns}
                  rows={data.topProviders}
                  rowKey={(r) => r.providerId}
                  emptyState={<div className="text-[12px] text-[var(--color-text-tertiary)] text-center py-8">No provider revenue yet.</div>}
                />
              </ClCard>
              <ClCard className="p-4">
                <div className="text-[14px] font-bold mb-1">Platform totals</div>
                <div className="text-[11px] text-[var(--color-text-tertiary)] mb-3">Lifetime counters across every surface</div>
                <div className="grid grid-cols-2 gap-2">
                  {platformEntries.map((e) => (
                    <div key={e.key} className="rounded-[8px] bg-[var(--color-surface-raised)] px-3 py-2" title={e.label}>
                      <div className="text-[15px] font-bold font-[family-name:var(--font-mono)]">{e.value.toLocaleString("en-NG")}</div>
                      <div className="text-[11px] text-[var(--color-text-tertiary)] truncate">{e.label}</div>
                    </div>
                  ))}
                </div>
              </ClCard>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
