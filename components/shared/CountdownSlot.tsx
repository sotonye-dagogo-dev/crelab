"use client";

import { useEffect, useState } from "react";
import { usePlatformConfig } from "@/lib/config-context";
import { selectWidgetsForArea } from "@/lib/countdown";
import { CountdownWidget } from "./CountdownWidget";
import type { CountdownArea } from "@/types";

interface CountdownSlotProps {
  area: CountdownArea;
  className?: string;
}

export function CountdownSlot({ area, className = "" }: CountdownSlotProps) {
  const config = usePlatformConfig();
  const countdown = config.countdown;
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!countdown?.enabled) return null;

  const widgets = selectWidgetsForArea(countdown.widgets ?? [], area, now ?? undefined);
  if (widgets.length === 0) return null;

  return (
    <section
      aria-label="Countdown"
      className={`max-w-[1200px] mx-auto px-6 py-6 ${className}`}
    >
      <div className="flex flex-wrap gap-4">
        {widgets.map((widget, index) => (
          <CountdownWidget
            key={widget.id}
            widget={widget}
            entranceDelay={index * 0.08}
            className="min-w-[280px] flex-1"
          />
        ))}
      </div>
    </section>
  );
}
