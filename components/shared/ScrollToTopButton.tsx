"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronUp } from "lucide-react";
import { usePlatformConfig } from "@/lib/config-context";

const FALLBACK_THRESHOLD_PX = 400;
const FALLBACK_LABEL = "Back to top";

export function ScrollToTopButton() {
  const config = usePlatformConfig();
  const scrollToTop = config.scrollToTop;
  const [visible, setVisible] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const enabled = scrollToTop?.enabled ?? true;
  const thresholdPx =
    typeof scrollToTop?.thresholdPx === "number" && scrollToTop.thresholdPx > 0
      ? scrollToTop.thresholdPx
      : FALLBACK_THRESHOLD_PX;
  const label = scrollToTop?.label?.trim() || FALLBACK_LABEL;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const handler = () => setVisible(window.scrollY > thresholdPx);
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [thresholdPx]);

  const handleClick = useCallback(() => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
  }, [prefersReducedMotion]);

  if (!enabled) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          key="scroll-to-top"
          type="button"
          onClick={handleClick}
          aria-label={label}
          title={label}
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.92 }}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.25,
            ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
          }}
          className="fixed bottom-8 right-8 max-[640px]:bottom-4 max-[640px]:right-4 z-40 w-11 h-11 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text-secondary)] shadow-md flex items-center justify-center cursor-pointer transition-colors hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
        >
          <ChevronUp size={20} strokeWidth={2.5} aria-hidden="true" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
