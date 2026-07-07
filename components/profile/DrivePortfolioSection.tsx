"use client";

import { useState } from "react";
import { Cloud } from "lucide-react";
import { ExploreVideoCard } from "@/components/shared/ExploreVideoCard";
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

  const driveItems = items.filter((item) => item.source === "DRIVE");
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
        {displayItems.map((item) => (
          <ExploreVideoCard
            key={item.id}
            item={item}
            onPlay={onPlay}
            size="sm"
          />
        ))}
      </div>

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
