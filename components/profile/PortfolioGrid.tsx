"use client";

import { useState } from "react";
import { Film } from "lucide-react";
import { ExploreVideoCard } from "@/components/shared/ExploreVideoCard";
import type { IPortfolioItem } from "@/types";

interface PortfolioGridProps {
  items: IPortfolioItem[];
  source?: "DIRECT" | "DRIVE";
  onPlay?: (item: IPortfolioItem) => void;
}

export function PortfolioGrid({ items, source, onPlay }: PortfolioGridProps) {
  const [cols, setCols] = useState(3);

  const filtered = source
    ? items.filter((item) => item.source === source)
    : items;

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
        {filtered.map((item) => (
          <ExploreVideoCard
            key={item.id}
            item={item}
            onPlay={onPlay}
            size={cols <= 2 ? "lg" : "md"}
          />
        ))}
      </div>
    </div>
  );
}
