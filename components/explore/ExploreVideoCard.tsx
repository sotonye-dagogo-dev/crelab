"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Play, HardDrive, Cloud, Image as ImageIcon, Film } from "lucide-react";
import type { IExploreCard, IPortfolioItem } from "@/types";

interface ExploreVideoCardProps {
  provider?: IExploreCard;
  portfolioItem?: IPortfolioItem;
}

export function ExploreVideoCard({ provider, portfolioItem }: ExploreVideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const isGalleryMode = !!portfolioItem && !provider;
  const displayName = provider?.displayName ?? portfolioItem?.providerName ?? "Unknown";
  const providerSlug = provider?.slug ?? portfolioItem?.providerSlug ?? "";
  const categoryLabel = provider?.categoryLabel ?? portfolioItem?.providerCategoryLabel ?? "";
  const providerVerified = provider?.verified ?? portfolioItem?.providerVerified ?? false;
  const rating = provider?.rating ?? portfolioItem?.avgRating ?? null;
  const packagePriceFromKobo = provider?.packagePriceFromKobo ?? null;
  const source = portfolioItem?.source;

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

  // Provider carousel: avatar + portfolio thumbnails, rotating interval (best-of-both-worlds)
  const providerCarouselImages = provider
    ? [
        // avatar first (if image), then portfolio thumbnails from ExploreService
        ...(provider.avatarUrl ? [provider.avatarUrl] : []),
        ...(provider.portfolioThumbnails ?? []),
      ].filter(Boolean).slice(0, 5)
    : [];
  const [carouselIndex, setCarouselIndex] = useState(0);

  useEffect(() => {
    if (!provider || providerCarouselImages.length <= 1 || prefersReducedMotion) return;
    // Don't animate when hovering video preview (video takes over)
    const id = setInterval(() => {
      setCarouselIndex((i) => (i + 1) % providerCarouselImages.length);
    }, 3500);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider?.id, providerCarouselImages.length, prefersReducedMotion, isInView ? "in" : "out"]);

  useEffect(() => {
    setCarouselIndex(0);
  }, [provider?.id]);

  const portfolioThumb = portfolioItem?.thumbnailUrl ?? null;
  const providerCarouselSrc = provider ? providerCarouselImages[carouselIndex] ?? null : null;
  const thumbnailUrl = portfolioThumb ?? providerCarouselSrc ?? provider?.avatarUrl ?? null;

  const hasAvatarFallback = !thumbnailUrl && !!provider?.displayName;
  const initials = hasAvatarFallback ? provider!.displayName.slice(0, 2).toUpperCase() : "";

  const videoUrl = portfolioItem?.url ?? provider?.previewVideoUrl ?? provider?.coverVideoUrl ?? null;
  const hasVideo = !prefersReducedMotion && !!videoUrl && (
    portfolioItem ? (portfolioItem.mimeType?.startsWith("video/") ?? false) : true
  );

  const handleVideoPlay = useCallback(() => {
    if (prefersReducedMotion || !videoUrl) return;
    if (portfolioItem && !portfolioItem.mimeType.startsWith("video/")) return;
    setShowVideo(true);
    setTimeout(() => {
      const video = videoRef.current;
      if (video) {
        video.play().catch(() => {});
      }
    }, 300);
  }, [prefersReducedMotion, videoUrl, portfolioItem]);

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

  const formatPrice = (kobo: number | null) => {
    if (kobo === null) return null;
    return `₦${(kobo / 100).toLocaleString("en-NG")}`;
  };

  const getSourceIcon = () => {
    if (source === "DRIVE") return <HardDrive size={10} strokeWidth={1.8} className="inline mr-1" />;
    return <Cloud size={10} strokeWidth={1.8} className="inline mr-1" />;
  };

  const getSourceLabel = () => {
    return source === "DRIVE" ? "Google Drive" : "Direct Upload";
  };

  const getMediaTypeIcon = () => {
    if (portfolioItem?.mimeType.startsWith("video/")) return <Film size={10} strokeWidth={1.8} className="inline mr-1" />;
    return <ImageIcon size={10} strokeWidth={1.8} className="inline mr-1" />;
  };

  return (
    <Link href={`/profile/${providerSlug}`} className="block no-underline">
      <div
        ref={cardRef}
        className="group relative rounded-[12px] overflow-hidden bg-[var(--color-surface)] cursor-pointer transition-[transform,box-shadow] duration-[200ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] hover:shadow-[0_0_0_1px_var(--color-accent),0_0_16px_rgba(232,255,71,0.15)] break-inside-avoid mb-2"
      >
        <div className="relative bg-[var(--color-surface-raised)] flex items-center justify-center w-full">
          {thumbnailUrl ? (
            <img
              key={provider ? `${provider.id}-${carouselIndex}` : thumbnailUrl}
              src={thumbnailUrl}
              alt={displayName}
              className={`w-full h-auto object-cover transition-opacity duration-[500ms] ${
                showVideo ? "opacity-0 absolute inset-0" : "opacity-100"
              } ${isLoaded ? "" : "opacity-0"}`}
              onLoad={() => setIsLoaded(true)}
              style={{ aspectRatio: "4/5" }}
            />
          ) : hasAvatarFallback ? (
            <div
              className="w-full flex items-center justify-center bg-gradient-to-br from-[var(--color-surface-raised)] to-[var(--color-surface)]"
              style={{ aspectRatio: "4/5" }}
            >
              <div className="w-14 h-14 rounded-full bg-[var(--color-accent-muted)] border border-[var(--color-accent)]/30 flex items-center justify-center text-[18px] font-bold font-[family-name:var(--font-display)] text-[var(--color-accent)]">
                {initials}
              </div>
            </div>
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
              className="w-full bg-[var(--color-surface-raised)] animate-pulse absolute inset-0"
              style={{ aspectRatio: "4/5" }}
            />
          )}
          {/* Carousel dots when multiple images */}
          {provider && providerCarouselImages.length > 1 && !showVideo && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-1 z-[2]">
              {providerCarouselImages.map((_, idx) => (
                <span
                  key={idx}
                  className={`w-1 h-1 rounded-full transition-all ${idx === carouselIndex ? "bg-[var(--color-accent)] w-4" : "bg-white/40"}`}
                />
              ))}
            </div>
          )}

          {hasVideo && (
            <video
              ref={videoRef}
              src={videoUrl}
              muted
              loop
              playsInline
              aria-label={`${displayName} preview video`}
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
            <div className="flex items-center gap-2 self-start mb-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-[family-name:var(--font-body)] text-[11px] font-medium whitespace-nowrap">
                {categoryLabel}
              </span>
              {isGalleryMode && source && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] bg-[var(--color-surface-raised)] text-[var(--color-text-tertiary)] font-[family-name:var(--font-body)] text-[9px] font-medium whitespace-nowrap border border-[var(--color-border)]">
                  {getSourceIcon()}
                  {getSourceLabel()}
                </span>
              )}
            </div>
            <span className="font-[family-name:var(--font-display)] text-[14px] font-medium text-[var(--color-text-primary)] leading-[1.2]">
              {displayName}
            </span>
            <div className="flex items-center gap-2">
              {rating !== null && (
                <span className="font-[family-name:var(--font-mono)] text-[12px] font-medium text-[var(--color-warning)] tabular-nums">
                  ★ {Number(rating).toFixed(1)}
                </span>
              )}
              {packagePriceFromKobo !== null && (
                <span className="font-[family-name:var(--font-body)] text-[12px] text-[var(--color-text-secondary)]">
                  from{" "}
                  <span className="font-[family-name:var(--font-mono)] text-[var(--color-accent)] font-medium">
                    {formatPrice(packagePriceFromKobo)}
                  </span>
                </span>
              )}
            </div>
            {isGalleryMode && portfolioItem && (
              <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-tertiary)] mt-1">
                {getMediaTypeIcon()}
                <span>{portfolioItem.mimeType}</span>
                {source && (
                  <>
                    <span>·</span>
                    {getSourceIcon()}
                    <span>{getSourceLabel()}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {providerVerified && (
            <div className="absolute bottom-2 right-2 bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-tertiary)] font-[family-name:var(--font-body)] text-[10px] px-1.5 py-0.5 rounded-[4px] leading-[1.4] z-[2]">
              Verified
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
