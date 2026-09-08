"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

export function BookingFlowSimulator() {
  const steps = ["Browse", "Request", "Escrow Held", "Delivered", "Released"];
  const [idx, setIdx] = useState(0);
  const progress = ((idx + 1) / steps.length) * 100;
  return (
    <div className="sandbox-card">
      <div className="sandbox-title">Booking Flow Simulator</div>
      <div className="sandbox-desc">Experience the end-to-end booking process</div>
      <div className="w-full h-2 bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-full overflow-hidden mb-3">
        <div className="h-full bg-[var(--color-accent)] transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>
      <div className="flex gap-1 mb-3 flex-wrap">
        {steps.map((s, i) => (
          <span key={s} className={`px-2 py-1 rounded-[6px] text-[11px] font-medium border ${i === idx ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)] border-[var(--color-accent)]" : i < idx ? "bg-[var(--color-success)]/15 text-[var(--color-success)] border-[var(--color-success)]/20" : "bg-[var(--color-surface-raised)] text-[var(--color-text-tertiary)] border-[var(--color-border)]"}`}>{i + 1}. {s}</span>
        ))}
      </div>
      <p className="text-[12px] text-[var(--color-text-secondary)] mb-3 min-h-[32px]">
        {idx === 0 && "Start by exploring creators and picking a package."}
        {idx === 1 && "Send a booking request with date & notes — creator accepts or negotiates."}
        {idx === 2 && "Payment is held by Paystack (escrow). Creator sees funds are secured."}
        {idx === 3 && "Creator delivers work. Client reviews and can request revision."}
        {idx === 4 && "Client approves → funds auto-release (or after 5 days). Dispute → admin mediates."}
      </p>
      <div className="flex gap-2">
        <button onClick={() => setIdx((v) => Math.max(0, v - 1))} disabled={idx === 0} className="h-8 px-3 rounded-[6px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[12px] font-semibold disabled:opacity-40 cursor-pointer">Back</button>
        <button onClick={() => setIdx((v) => Math.min(steps.length - 1, v + 1))} disabled={idx === steps.length - 1} className="h-8 px-3 rounded-[6px] bg-[var(--color-accent)] text-[var(--color-text-inverse)] text-[12px] font-semibold disabled:opacity-40 cursor-pointer">Next</button>
        {idx === steps.length - 1 && <Link href="/explore" className="h-8 px-3 rounded-[6px] border border-[var(--color-accent)] text-[var(--color-accent)] text-[12px] font-semibold inline-flex items-center no-underline">Explore creators →</Link>}
      </div>
      <span className="sandbox-type mt-3">booking-simulator</span>
    </div>
  );
}

export function EscrowTimelineExplorer() {
  const states = [
    { label: "Held", color: "var(--color-escrow-held)", desc: "Funds locked on booking. Neither party can touch them." },
    { label: "In Progress", color: "var(--color-escrow-progress)", desc: "Creator works. Milestones can be funded & submitted." },
    { label: "Release Pending", color: "var(--color-warning)", desc: "Work delivered. Client has 5 days to approve/dispute." },
    { label: "Released", color: "var(--color-escrow-released)", desc: "Funds settled to creator wallet — withdrawable." },
    { label: "Disputed", color: "var(--color-escrow-disputed)", desc: "Admin reviews evidence and decides split." },
  ];
  const [active, setActive] = useState(0);
  return (
    <div className="sandbox-card">
      <div className="sandbox-title">Escrow Timeline Explorer</div>
      <div className="sandbox-desc">Visualize money movement from payment to settlement</div>
      <div className="flex items-center gap-1 mb-3 overflow-x-auto py-1">
        {states.map((s, i) => (
          <button key={s.label} onClick={() => setActive(i)} className={`shrink-0 px-2.5 py-1.5 rounded-full text-[11px] font-semibold border cursor-pointer transition-colors ${i === active ? "text-[var(--color-text-inverse)]" : "bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] border-[var(--color-border)]"}`} style={i === active ? { background: s.color, borderColor: s.color } : {}}>
            {s.label}
          </button>
        ))}
      </div>
      <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3 mb-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: states[active].color }} />
          <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">{states[active].label}</span>
        </div>
        <p className="text-[12px] text-[var(--color-text-secondary)]">{states[active].desc}</p>
        <div className="mt-3 h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden flex">
          {states.map((s, i) => (
            <div key={s.label} className="flex-1 transition-opacity" style={{ background: s.color, opacity: i <= active ? 1 : 0.15 }} />
          ))}
        </div>
      </div>
      <span className="sandbox-type">escrow-timeline</span>
    </div>
  );
}

export function PricingCalculator() {
  const [tier, setTier] = useState<"standard" | "premium">("standard");
  const [videos, setVideos] = useState(2);
  const base = tier === "standard" ? 25000 : 60000;
  const total = base * videos;
  const fee = Math.round(total * 0.05);
  const payout = total - fee;
  return (
    <div className="sandbox-card">
      <div className="sandbox-title">Pricing Calculator</div>
      <div className="sandbox-desc">Estimate costs including the 5% platform fee</div>
      <div className="flex gap-2 mb-3">
        {(["standard", "premium"] as const).map((t) => (
          <button key={t} onClick={() => setTier(t)} className={`flex-1 h-9 rounded-[8px] text-[12px] font-semibold capitalize cursor-pointer border ${tier === t ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)] border-[var(--color-accent)]" : "bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] border-[var(--color-border)]"}`}>{t}</button>
        ))}
      </div>
      <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">Videos: {videos}</label>
      <input type="range" min={1} max={10} value={videos} onChange={(e) => setVideos(Number(e.target.value))} className="w-full accent-[var(--color-accent)] my-2" />
      <div className="space-y-1 text-[12px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-[8px] p-3">
        <div className="flex justify-between"><span className="text-[var(--color-text-secondary)]">Subtotal ({videos} × ₦{base.toLocaleString()})</span><span className="font-mono text-[var(--color-text-primary)]">₦{total.toLocaleString()}</span></div>
        <div className="flex justify-between"><span className="text-[var(--color-text-secondary)]">Platform fee (5%)</span><span className="font-mono text-[var(--color-text-primary)]">₦{fee.toLocaleString()}</span></div>
        <div className="flex justify-between font-semibold border-t border-[var(--color-border)] pt-1 mt-1"><span>Creator payout</span><span className="font-mono text-[var(--color-success)]">₦{payout.toLocaleString()}</span></div>
      </div>
      <span className="sandbox-type mt-3">pricing-calculator</span>
    </div>
  );
}

export function SearchSimulator() {
  const [completeness, setCompleteness] = useState(65);
  const rank = useMemo(() => {
    if (completeness < 30) return { label: "Low visibility", rank: "Page 3+", color: "var(--color-error)" };
    if (completeness < 70) return { label: "Moderate", rank: "Page 1–2", color: "var(--color-warning)" };
    return { label: "High visibility", rank: "Top results", color: "var(--color-success)" };
  }, [completeness]);
  return (
    <div className="sandbox-card">
      <div className="sandbox-title">Search & Discovery Simulator</div>
      <div className="sandbox-desc">See how profile completeness boosts search ranking</div>
      <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">Profile completeness: {completeness}%</label>
      <input type="range" min={0} max={100} value={completeness} onChange={(e) => setCompleteness(Number(e.target.value))} className="w-full accent-[var(--color-accent)] my-2" />
      <div className="rounded-[8px] border border-[var(--color-border)] p-3 flex items-center justify-between" style={{ background: "var(--color-surface-raised)" }}>
        <div>
          <div className="text-[12px] font-semibold" style={{ color: rank.color }}>{rank.label}</div>
          <div className="text-[11px] text-[var(--color-text-tertiary)]">{rank.rank} · {completeness}% complete</div>
        </div>
        <span className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-bold text-[var(--color-text-inverse)]" style={{ background: rank.color }}>{completeness}%</span>
      </div>
      <ul className="text-[11px] text-[var(--color-text-secondary)] list-disc pl-4 mt-2 space-y-0.5">
        <li>Avatar + cover video boost ranking</li>
        <li>Portfolio items (≥3) + packages (≥1) required for top</li>
        <li>Reviews & bookings improve placement</li>
      </ul>
      <span className="sandbox-type mt-3">search-simulator</span>
    </div>
  );
}

export function SandboxesGrid() {
  return (
    <div className="sandbox-grid">
      <BookingFlowSimulator />
      <EscrowTimelineExplorer />
      <PricingCalculator />
      <SearchSimulator />
    </div>
  );
}
