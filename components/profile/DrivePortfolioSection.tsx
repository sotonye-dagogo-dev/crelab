"use client";

import { useState, useMemo } from "react";
import { Cloud } from "lucide-react";
import { ExploreVideoCard } from "@/components/shared/ExploreVideoCard";
import { AssetLightbox } from "./AssetLightbox";
import { dedupePortfolioItems } from "@/lib/portfolio";
import type { IPortfolioItem } from "@/types";

interface DrivePortfolioSectionProps {
  items: IPortfolioItem[];
  providerName: string;
  onPlay?: (item: IPortfolioItem) => void;
}

export function DrivePortfolioSection({
  items,
  providerName,
  onPlay,
}: DrivePortfolioSectionProps) {
  const [showAll, setShowAll] = useState(false);
  const [active, setActive] = useState<IPortfolioItem | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const deduped = useMemo(() => dedupePortfolioItems(items), [items]);
  const driveItems = useMemo(() => deduped.filter((item) => item.source === "DRIVE"), [deduped]);
  const displayItems = showAll ? driveItems : driveItems.slice(0, 6);

  if (driveItems.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="flex items-center gap-2 mb-4">
        <Cloud size={18} strokeWidth={1.5} color="var(--color-accent)" />
        <h2 className="font-[family-name:var(--font-display)] font-bold text-[18px] text-[var(--color-text-primary)]">
          Google Drive Portfolio
        </h2>
      </div>

      <p className="text-[13px] text-[var(--color-text-secondary)] mb-4">
        Synced content from {providerName}&apos;s Drive folder
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {displayItems.map((item, idx) => (
          <ExploreVideoCard
            key={`${item.id}-${idx}`}
            item={{ ...item, providerName } as IPortfolioItem}
            onPlay={(it) => {
              if (onPlay) onPlay(it);
              else {
                setActive(it);
                setActiveIndex(driveItems.indexOf(item) + 1);
              }
            }}
            size="sm"
          />
        ))}
      </div>
      <AssetLightbox item={active} providerName={providerName} indexOneBased={activeIndex} onClose={() => setActive(null)} />

      {driveItems.length > 6 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-4 text-[13px] text-[var(--color-accent)] cursor-pointer hover:underline"
        >
          {showAll
            ? "Show less"
            : `View all ${driveItems.length} items`}
        </button>
      )}
    </section>
  );
}
