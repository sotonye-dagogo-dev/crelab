"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import type { IExploreCard, IPortfolioItem } from "@/types";

interface ExploreVideoCardProps {
  provider: IExploreCard;
  portfolioItem?: IPortfolioItem;
}

export function ExploreVideoCard({ provider, portfolioItem }: ExploreVideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.5 },
    );

    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  const handleVideoPlay = useCallback(() => {
    if (prefersReducedMotion || !portfolioItem?.url || !portfolioItem.mimeType.startsWith("video/")) return;
    setShowVideo(true);
    setTimeout(() => {
      const video = videoRef.current;
      if (video) {
        video.play().catch(() => {});
      }
    }, 300);
  }, [prefersReducedMotion, portfolioItem]);

  const handleVideoPause = useCallback(() => {
    setShowVideo(false);
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
  }, []);

  useEffect(() => {
    if (isInView) {
      handleVideoPlay();
    } else {
      handleVideoPause();
    }
  }, [isInView, handleVideoPlay, handleVideoPause]);

  const thumbnailUrl = portfolioItem?.thumbnailUrl ?? null;
  const videoUrl = portfolioItem?.url ?? provider.previewVideoUrl;
  const hasVideo = !prefersReducedMotion && videoUrl && (portfolioItem?.mimeType ?? "").startsWith("video/");

  const formatPrice = (kobo: number | null) => {
    if (kobo === null) return null;
    return `₦${(kobo / 100).toLocaleString("en-NG")}`;
  };

  return (
    <Link href={`/profile/${provider.slug}`} className="block no-underline">
      <div
        ref={cardRef}
        className="group relative rounded-[12px] overflow-hidden bg-[var(--color-surface)] cursor-pointer transition-[transform,box-shadow] duration-[200ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] hover:shadow-[0_0_0_1px_var(--color-accent),0_0_16px_rgba(232,255,71,0.15)] break-inside-avoid mb-2"
      >
        <div className="relative bg-[var(--color-surface-raised)] flex items-center justify-center w-full">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={provider.displayName}
              className={`w-full h-auto object-cover transition-opacity duration-[300ms] ${
                showVideo ? "opacity-0 absolute inset-0" : "opacity-100"
              } ${isLoaded ? "" : "opacity-0"}`}
              onLoad={() => setIsLoaded(true)}
              style={{ aspectRatio: "4/5" }}
            />
          ) : (
            <div
              className="w-full bg-[var(--color-surface-raised)] flex items-center justify-center"
              style={{ aspectRatio: "4/5" }}
            >
              <Play size={24} className="text-[rgba(255,255,255,0.5)]" fill="currentColor" />
            </div>
          )}

          {!isLoaded && thumbnailUrl && (
            <div
              className="w-full bg-[var(--color-surface-raised)] animate-pulse"
              style={{ aspectRatio: "4/5" }}
            />
          )}

          {hasVideo && (
            <video
              ref={videoRef}
              src={videoUrl}
              muted
              loop
              playsInline
              aria-label={`${provider.displayName} preview video`}
              className={`w-full h-auto object-cover absolute inset-0 transition-opacity duration-[300ms] ${
                showVideo ? "opacity-100" : "opacity-0"
              }`}
              style={{ aspectRatio: "4/5" }}
            />
          )}

          <div className="absolute bottom-0 left-0 right-0 h-[60%] bg-gradient-to-b from-transparent to-[rgba(0,0,0,0.85)] pointer-events-none" />

          <div className="absolute top-3 left-1/2 -translate-x-1/2 -translate-y-2 bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-[family-name:var(--font-body)] font-semibold text-[12px] px-3 py-1.5 rounded-[9999px] opacity-0 transition-[opacity,transform] duration-[200ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none whitespace-nowrap z-[2] group-hover:opacity-100 group-hover:translate-y-0">
            View Profile →
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col gap-[2px]">
            <span className="self-start mb-2 inline-flex items-center px-2 py-0.5 rounded-[4px] bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-[family-name:var(--font-body)] text-[11px] font-medium whitespace-nowrap">
              {provider.categoryLabel || provider.categorySlug}
            </span>
            <span className="font-[family-name:var(--font-display)] text-[14px] font-medium text-[var(--color-text-primary)] leading-[1.2]">
              {provider.displayName}
            </span>
            <div className="flex items-center gap-2">
              {provider.rating !== null && (
                <span className="font-[family-name:var(--font-mono)] text-[12px] font-medium text-[var(--color-warning)] tabular-nums">
                  ★ {provider.rating.toFixed(1)}
                </span>
              )}
              {provider.packagePriceFromKobo !== null && (
                <span className="font-[family-name:var(--font-body)] text-[12px] text-[var(--color-text-secondary)]">
                  from{" "}
                  <span className="font-[family-name:var(--font-mono)] text-[var(--color-accent)] font-medium">
                    {formatPrice(provider.packagePriceFromKobo)}
                  </span>
                </span>
              )}
            </div>
          </div>

          {provider.verified && (
            <div className="absolute bottom-2 right-2 bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-tertiary)] font-[family-name:var(--font-body)] text-[10px] px-1.5 py-0.5 rounded-[4px] leading-[1.4] z-[2]">
              Verified
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
