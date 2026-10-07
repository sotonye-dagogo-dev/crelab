"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { ICountdownWidget } from "@/types";
import { countdownParts, isWidgetExpired, padUnit } from "@/lib/countdown";
import { resolveCountdownIcon } from "@/lib/countdown-icons";

interface CountdownWidgetProps {
  widget: ICountdownWidget;
  preview?: boolean;
  entranceDelay?: number;
  className?: string;
}

const UNITS = [
  { key: "days", label: "Days" },
  { key: "hours", label: "Hours" },
  { key: "minutes", label: "Mins" },
  { key: "seconds", label: "Secs" },
] as const;

const DIGIT_EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

function RollingDigit({ value, reducedMotion }: { value: string; reducedMotion: boolean }) {
  if (reducedMotion) {
    return <span className="tabular-nums">{value}</span>;
  }

  return (
    <span className="inline-flex tabular-nums">
      {value.split("").map((digit, index) => (
        <span
          key={index}
          className="relative inline-block overflow-hidden text-center"
          style={{ width: "1ch", height: "1.15em", lineHeight: "1.15em" }}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={digit}
              initial={{ y: "-110%", opacity: 0 }}
              animate={{ y: "0%", opacity: 1 }}
              exit={{ y: "110%", opacity: 0 }}
              transition={{ duration: 0.35, ease: DIGIT_EASE }}
              style={{ display: "inline-block", lineHeight: "1.15em" }}
            >
              {digit}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  );
}

export function CountdownWidget({
  widget,
  preview = false,
  entranceDelay = 0,
  className = "",
}: CountdownWidgetProps) {
  const [now, setNow] = useState<number | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!preview && now !== null && isWidgetExpired(widget, now)) return null;

  const Icon = resolveCountdownIcon(widget.icon);
  const parts = now === null ? null : countdownParts(widget.endsAt, now);
  const values: Record<(typeof UNITS)[number]["key"], string> = {
    days: parts ? String(parts.days) : "00",
    hours: parts ? padUnit(parts.hours) : "00",
    minutes: parts ? padUnit(parts.minutes) : "00",
    seconds: parts ? padUnit(parts.seconds) : "00",
  };
  const showCta = Boolean(widget.ctaLabel && widget.ctaHref);
  const endsAtMs = Date.parse(widget.endsAt);
  const timerLabel =
    now !== null && !Number.isNaN(endsAtMs)
      ? `${widget.title} ends ${new Date(endsAtMs).toLocaleString("en-GB")}`
      : widget.title;

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: entranceDelay, ease: DIGIT_EASE }}
      className={`relative flex flex-col gap-4 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 md:p-6 ${className}`}
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--color-accent-muted)] border border-[var(--color-accent)]/20 text-[var(--color-accent)]">
          <Icon size={18} strokeWidth={2} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="font-[family-name:var(--font-display)] font-semibold text-[15px] leading-snug text-[var(--color-text-primary)]">
            {widget.title}
          </h3>
          {widget.description && (
            <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
              {widget.description}
            </p>
          )}
        </div>
      </div>

      <div
        role="timer"
        aria-label={timerLabel}
        className="flex flex-wrap items-end gap-1.5"
      >
        {UNITS.map((unit, index) => (
          <div key={unit.key} className="flex items-end gap-1.5">
            {index > 0 && (
              <span className="pb-[1.35em] text-[22px] font-bold leading-none text-[var(--color-text-tertiary)]">
                :
              </span>
            )}
            <div className="flex flex-col items-center">
              <span className="font-[family-name:var(--font-display)] text-[26px] font-extrabold leading-none text-[var(--color-text-primary)] md:text-[30px]">
                <RollingDigit
                  value={values[unit.key]}
                  reducedMotion={prefersReducedMotion}
                />
              </span>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
                {unit.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {showCta && (
        <Link
          href={widget.ctaHref as string}
          className="inline-flex w-fit items-center gap-1.5 text-[13px] font-semibold text-[var(--color-accent)] hover:underline underline-offset-4"
        >
          {widget.ctaLabel} <ArrowRight size={14} strokeWidth={2} />
        </Link>
      )}
    </motion.div>
  );
}
