"use client";

import { useMemo, useState } from "react";

/* ── Reusable SVG charts for the admin analytics page ──
   No third-party chart dependency: pure SVG + CSS variables so the charts
   follow the platform theme (light/dark) with zero extra bundle weight.
   Every chart exposes hover tooltips and honest empty states. */

export interface IChartPoint {
  day: string;
  value: number;
}

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(value));
  const norm = value / mag;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return nice * mag;
}

const CHART_PAD = { l: 8, r: 8, t: 10, b: 22 };

export function LineChart({
  data,
  formatValue,
  height = 180,
  accent = "var(--color-accent)",
}: {
  data: IChartPoint[];
  formatValue: (v: number, day: string) => string;
  height?: number;
  accent?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 600;
  const H = height;

  const { path, area, points, max } = useMemo(() => {
    const max = niceMax(Math.max(...data.map((d) => d.value), 0));
    const iw = W - CHART_PAD.l - CHART_PAD.r;
    const ih = H - CHART_PAD.t - CHART_PAD.b;
    const pts = data.map((d, i) => ({
      x: data.length === 1 ? CHART_PAD.l + iw / 2 : CHART_PAD.l + (i / (data.length - 1)) * iw,
      y: CHART_PAD.t + ih - (d.value / max) * ih,
    }));
    const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const area = `${path} L${(pts[pts.length - 1]?.x ?? 0).toFixed(1)},${(H - CHART_PAD.b).toFixed(1)} L${(pts[0]?.x ?? 0).toFixed(1)},${(H - CHART_PAD.b).toFixed(1)} Z`;
    return { path, area, points: pts, max };
  }, [data, H]);

  if (data.length === 0) {
    return <div className="text-[12px] text-[var(--color-text-tertiary)] py-8 text-center">No data for this period.</div>;
  }

  const hovered = hover !== null ? data[hover] : null;
  const showLabels = [0, Math.floor((data.length - 1) / 2), data.length - 1];

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height }}
        onMouseMove={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * W;
          const iw = W - CHART_PAD.l - CHART_PAD.r;
          const frac = Math.min(1, Math.max(0, (px - CHART_PAD.l) / iw));
          setHover(Math.round(frac * (data.length - 1)));
        }}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label="Trend chart"
      >
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={CHART_PAD.l}
            x2={W - CHART_PAD.r}
            y1={CHART_PAD.t + (H - CHART_PAD.t - CHART_PAD.b) * (1 - f)}
            y2={CHART_PAD.t + (H - CHART_PAD.t - CHART_PAD.b) * (1 - f)}
            stroke="var(--color-border)"
            strokeWidth={0.5}
            strokeDasharray="3 3"
          />
        ))}
        <path d={area} fill={accent} opacity={0.12} />
        <path d={path} fill="none" stroke={accent} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {showLabels.map((i) => (
          <text
            key={i}
            x={points[i]?.x ?? 0}
            y={H - 6}
            textAnchor="middle"
            fontSize={9}
            fill="var(--color-text-tertiary)"
          >
            {data[i]?.day.slice(5)}
          </text>
        ))}
        {hover !== null && points[hover] && (
          <g>
            <line
              x1={points[hover].x}
              x2={points[hover].x}
              y1={CHART_PAD.t}
              y2={H - CHART_PAD.b}
              stroke="var(--color-text-tertiary)"
              strokeWidth={1}
              strokeDasharray="2 2"
            />
            <circle cx={points[hover].x} cy={points[hover].y} r={4} fill={accent} stroke="var(--color-surface)" strokeWidth={2} />
          </g>
        )}
      </svg>
      {hovered && points[hover!] && (
        <div
          className="absolute z-10 pointer-events-none px-2.5 py-1.5 rounded-[8px] border border-[var(--color-border-mid)] bg-[var(--color-surface-raised)] shadow-lg whitespace-nowrap"
          style={{
            left: `min(max(${(points[hover!].x / W) * 100}%, 70px), calc(100% - 70px))`,
            top: 0,
            transform: "translateX(-50%)",
          }}
        >
          <div className="text-[11px] font-semibold text-[var(--color-text-primary)]">{formatValue(hovered.value, hovered.day)}</div>
          <div className="text-[10px] text-[var(--color-text-tertiary)] font-[family-name:var(--font-mono)]">{hovered.day}</div>
        </div>
      )}
      <div className="sr-only">Peak value {max}</div>
    </div>
  );
}

export function BarList({
  data,
  formatValue,
  money,
}: {
  data: { key: string; label: string; value: number }[];
  formatValue: (v: number) => string;
  money?: boolean;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  if (data.length === 0) {
    return <div className="text-[12px] text-[var(--color-text-tertiary)] py-8 text-center">No data for this period.</div>;
  }
  return (
    <div className="flex flex-col gap-2.5">
      {data.map((d) => (
        <div key={d.key} title={`${d.label}: ${formatValue(d.value)}`} className="group">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[12px] text-[var(--color-text-secondary)] truncate">{d.label}</span>
            <span className={`text-[12px] font-semibold font-[family-name:var(--font-mono)] ${money ? "text-[var(--color-accent)]" : "text-[var(--color-text-primary)]"}`}>
              {formatValue(d.value)}
            </span>
          </div>
          <div className="h-2 rounded-full bg-[var(--color-surface-raised)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-300 group-hover:opacity-80"
              style={{ width: `${Math.max(2, (d.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

const DONUT_COLORS = ["#E8FF47", "#7DD3FC", "#F0ABFC", "#FDBA74", "#86EFAC", "#FCA5A5", "#C4B5FD", "#94A3B8"];

export function DonutChart({
  data,
  formatValue,
}: {
  data: { key: string; label: string; value: number }[];
  formatValue: (v: number) => string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const total = data.reduce((acc, d) => acc + d.value, 0);
  const R = 54;
  const C = 2 * Math.PI * R;

  if (data.length === 0 || total <= 0) {
    return <div className="text-[12px] text-[var(--color-text-tertiary)] py-8 text-center">No data for this period.</div>;
  }

  let offset = 0;
  const segs = data.map((d, i) => {
    const frac = d.value / total;
    const seg = { ...d, frac, dash: frac * C, gap: C, start: offset, color: DONUT_COLORS[i % DONUT_COLORS.length] };
    offset += frac;
    return seg;
  });

  const shown = active !== null ? segs[active] : null;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="relative flex-shrink-0">
        <svg width={140} height={140} viewBox="0 0 140 140" role="img" aria-label="Breakdown chart">
          <circle cx={70} cy={70} r={R} fill="none" stroke="var(--color-surface-raised)" strokeWidth={18} />
          {segs.map((s, i) => (
            <circle
              key={s.key}
              cx={70}
              cy={70}
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth={active === i ? 22 : 18}
              strokeDasharray={`${s.dash} ${s.gap}`}
              strokeDashoffset={-s.start * C + C * 0.25}
              transform="rotate(-90 70 70)"
              opacity={active === null || active === i ? 1 : 0.35}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              className="cursor-pointer transition-all"
            >
              <title>{`${s.label}: ${formatValue(s.value)}`}</title>
            </circle>
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[15px] font-bold text-[var(--color-text-primary)] font-[family-name:var(--font-mono)]">
            {shown ? formatValue(shown.value) : String(total)}
          </span>
          <span className="text-[10px] text-[var(--color-text-tertiary)] max-w-[90px] truncate">
            {shown ? shown.label : "total"}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 min-w-0 flex-1 w-full">
        {segs.map((s, i) => (
          <button
            key={s.key}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            onClick={() => setActive(active === i ? null : i)}
            className="flex items-center gap-2 text-left cursor-pointer bg-transparent border-none p-0"
            title={`${s.label}: ${formatValue(s.value)} (${((s.frac) * 100).toFixed(1)}%)`}
          >
            <span className="w-2.5 h-2.5 rounded-[3px] flex-shrink-0" style={{ background: s.color }} />
            <span className="text-[12px] text-[var(--color-text-secondary)] truncate flex-1">{s.label}</span>
            <span className="text-[11px] text-[var(--color-text-tertiary)] font-[family-name:var(--font-mono)]">
              {(s.frac * 100).toFixed(0)}%
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
