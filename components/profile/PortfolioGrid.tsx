"use client";

import { useState, useMemo } from "react";
import { Film } from "lucide-react";
import { ExploreVideoCard } from "@/components/shared/ExploreVideoCard";
import { AssetLightbox } from "./AssetLightbox";
import { dedupePortfolioItems } from "@/lib/portfolio";
import type { IPortfolioItem } from "@/types";

interface PortfolioGridProps {
  items: IPortfolioItem[];
  source?: "DIRECT" | "DRIVE";
  onPlay?: (item: IPortfolioItem) => void;
  providerName?: string;
}

export function PortfolioGrid({ items, source, onPlay, providerName }: PortfolioGridProps) {
  const [cols, setCols] = useState(3);
  const [active, setActive] = useState<IPortfolioItem | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(0);

  const deduped = useMemo(() => dedupePortfolioItems(items), [items]);
  const filtered = useMemo(() => {
    const base = source ? deduped.filter((item) => item.source === source) : deduped;
    return base;
  }, [deduped, source]);

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Film size={40} strokeWidth={1.5} color="var(--color-text-tertiary)" className="mb-3" />
        <p className="text-[14px] text-[var(--color-text-tertiary)]">
          No portfolio items yet
        </p>
      </div>
    );
  }

  return (
    <div>
      {filtered.length > 8 && (
        <div className="flex items-center gap-2 mb-4">
          {[2, 3, 4].map((n) => (
            <button
              key={n}
              onClick={() => setCols(n)}
              className={`h-8 px-3 rounded-[6px] text-[12px] font-medium cursor-pointer transition-colors ${
                cols === n
                  ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)]"
                  : "bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {n} cols
            </button>
          ))}
        </div>
      )}

      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${Math.min(cols, filtered.length)}, 1fr)`,
        }}
      >
        {filtered.map((item, idx) => (
          <ExploreVideoCard
            key={`${item.id}-${idx}`}
            item={{ ...item, providerName: providerName ?? item.providerName } as IPortfolioItem}
            onPlay={(it) => {
              if (onPlay) onPlay(it);
              else {
                setActive(it);
                setActiveIndex(idx + 1);
              }
            }}
            size={cols <= 2 ? "lg" : "md"}
          />
        ))}
      </div>
      <AssetLightbox item={active} providerName={providerName} indexOneBased={activeIndex} onClose={() => setActive(null)} />
    </div>
  );
}
