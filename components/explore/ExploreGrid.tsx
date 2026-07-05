"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExploreVideoCard } from "./ExploreVideoCard";
import type { IExploreCard } from "@/types";

const shimmerBase = "bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.05)] to-transparent bg-[length:200%_100%] animate-shimmer";

const cardVariants = {
  hidden: { opacity: 0, y: -8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      delay: i * 0.03,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  }),
};

function SkeletonCard() {
  return (
    <div className="rounded-[12px] overflow-hidden bg-[var(--color-surface)] mb-2 break-inside-avoid">
      <div className="relative w-full bg-[var(--color-surface-raised)]" style={{ aspectRatio: "4/5" }}>
        <div className={`absolute inset-0 ${shimmerBase}`} />
      </div>
      <div className="p-3 space-y-2">
        <div className={`h-3 w-20 rounded ${shimmerBase}`} />
        <div className={`h-4 w-32 rounded ${shimmerBase}`} />
        <div className={`h-3 w-24 rounded ${shimmerBase}`} />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 px-6">
      <div className="font-[family-name:var(--font-display)] text-[20px] font-bold text-[var(--color-text-primary)]">
        No creators found
      </div>
      <div className="font-[family-name:var(--font-body)] text-[14px] text-[var(--color-text-secondary)] mt-2">
        Try adjusting your filters or search terms
      </div>
    </div>
  );
}

interface ExploreGridProps {
  providers: IExploreCard[];
  isLoading: boolean;
  hasMore: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  isError: boolean;
}

export function ExploreGrid({
  providers,
  isLoading,
  hasMore,
  isFetchingNextPage,
  fetchNextPage,
  isError,
}: ExploreGridProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const entry = entries[0];
      if (entry.isIntersecting && hasMore && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasMore, isFetchingNextPage, fetchNextPage],
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(handleIntersection, {
      rootMargin: "80% 0px 0px 0px",
    });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleIntersection]);

  if (isError) {
    return (
      <div className="text-center py-16 px-6">
        <div className="font-[family-name:var(--font-display)] text-[20px] font-bold text-[var(--color-error)]">
          Something went wrong
        </div>
        <div className="font-[family-name:var(--font-body)] text-[14px] text-[var(--color-text-secondary)] mt-2">
          Please try again later
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 pt-6">
      <div className="[column-count:2] [column-gap:0.5rem] sm:[column-count:3] lg:[column-count:4] xl:[column-count:5]">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
        ) : providers.length === 0 ? (
          <EmptyState />
        ) : prefersReducedMotion ? (
          providers.map((provider) => (
            <div key={provider.id}>
              <ExploreVideoCard provider={provider} />
            </div>
          ))
        ) : (
          <AnimatePresence mode="popLayout">
            {providers.map((provider, i) => (
              <motion.div
                key={provider.id}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                layout
              >
                <ExploreVideoCard provider={provider} />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <div ref={sentinelRef} className="h-4" />

      {isFetchingNextPage && (
        <div className="flex justify-center py-8">
          <div className="flex items-center gap-2 text-[var(--color-text-tertiary)] text-[13px]">
            <span className="inline-block w-4 h-4 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
            Loading more...
          </div>
        </div>
      )}

      {!hasMore && providers.length > 0 && (
        <div className="flex justify-center py-8">
          <span className="text-[13px] text-[var(--color-text-tertiary)]">
            You&apos;ve reached the end
          </span>
        </div>
      )}
    </div>
  );
}

export { SkeletonCard };
