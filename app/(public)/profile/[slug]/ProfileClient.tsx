"use client";

import { useState } from "react";
import Link from "next/link";
import { BookingBottomBar } from "@/components/profile/BookingBottomBar";
import { BookingSidebar } from "@/components/profile/BookingSidebar";
import { ServicePackages } from "@/components/profile/ServicePackages";
import { ProviderHero } from "@/components/profile/ProviderHero";
import { PortfolioGrid } from "@/components/profile/PortfolioGrid";
import { DrivePortfolioSection } from "@/components/profile/DrivePortfolioSection";
import { WorkHistory } from "@/components/profile/WorkHistory";
import { ReviewsSection } from "@/components/profile/ReviewsSection";
import type {
  IServicePackage,
  IProvider,
  IPortfolioItem,
  IReview,
} from "@/types";

interface ReviewWithMeta extends IReview {
  reviewerName: string;
  reviewerAvatar: string | null;
  verifiedBooking: boolean;
}

interface WorkHistoryItem {
  id: string;
  title: string;
  clientName: string;
  completedAt: string;
  description: string;
}

interface ProfileClientProps {
  packages: IServicePackage[];
  providerId: string;
  /** When provided (alongside provider/portfolio), renders the full synced
      portfolio content: packages grid + desktop sidebar share one selection. */
  provider?: IProvider;
  providerName?: string;
  portfolio?: IPortfolioItem[];
  reviewData?: ReviewWithMeta[];
  workHistory?: WorkHistoryItem[];
  isOwnProfile?: boolean;
}

function defaultSelected(packages: IServicePackage[]): IServicePackage | null {
  return packages.find((p) => p.tier === "STANDARD") ?? packages[0] ?? null;
}

export function ProfileClient({
  packages,
  providerId,
  provider,
  providerName,
  portfolio,
  reviewData,
  workHistory,
  isOwnProfile,
}: ProfileClientProps) {
  const [selectedPackage, setSelectedPackage] = useState<IServicePackage | null>(
    () => defaultSelected(packages),
  );

  const handleSelectPackage = (pkg: IServicePackage) => {
    setSelectedPackage(pkg);
  };

  // Legacy mode: only packages were passed (kept for backward compatibility).
  // Renders the grid + bottom bar without the surrounding content.
  if (!provider || !portfolio) {
    return (
      <>
        <BookingBottomBar selectedPackage={selectedPackage} providerId={providerId} />
        <ServicePackages
          packages={packages}
          selectedId={selectedPackage?.id}
          onSelect={handleSelectPackage}
        />
      </>
    );
  }

  const name = provider.displayName ?? providerName ?? "Provider";
  const driveItems = portfolio.filter((item) => item.source === "DRIVE");
  const directItems = portfolio.filter((item) => item.source === "DIRECT");

  return (
    <>
      <div className="mb-4">
        <Link
          href="/explore"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-text-secondary)] no-underline hover:text-[var(--color-accent)] transition-colors"
        >
          ← Back to Explore
        </Link>
      </div>
      <ProviderHero provider={provider} isOwnProfile={isOwnProfile} />

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
        <div className="min-w-0">
          <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <h2 className="font-[family-name:var(--font-display)] font-bold text-[16px] text-[var(--color-text-primary)] mb-1">
              About
            </h2>
            <p className="text-[14px] text-[var(--color-text-secondary)] leading-relaxed">
              {provider.bio ?? "No bio yet"}
            </p>
            {provider.yearsActive && (
              <p className="text-[13px] text-[var(--color-text-tertiary)] mt-2">
                {provider.yearsActive}+ years of experience
              </p>
            )}
          </div>

          {directItems.length > 0 && (
            <div className="mt-6">
              <h2 className="font-[family-name:var(--font-display)] font-bold text-[18px] text-[var(--color-text-primary)] mb-3">
                Portfolio
              </h2>
              <PortfolioGrid items={directItems} providerName={name} />
            </div>
          )}

          {driveItems.length > 0 && (
            <DrivePortfolioSection
              items={portfolio}
              providerName={name}
            />
          )}

          {portfolio.length === 0 && (
            <div className="mt-6 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-center">
              <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                No work published yet
              </p>
              <p className="text-[13px] text-[var(--color-text-secondary)] mt-1">
                {name} hasn&apos;t added any portfolio pieces.
              </p>
            </div>
          )}

          <ServicePackages
            packages={packages}
            selectedId={selectedPackage?.id}
            onSelect={handleSelectPackage}
          />
          <WorkHistory items={workHistory ?? []} />
          <ReviewsSection reviews={reviewData ?? []} />

          {/* Spacer for the fixed bottom bar on phones + tablets (below lg). */}
          <div className="h-20 lg:hidden" aria-hidden="true" />
        </div>

        <div className="hidden lg:block">
          {packages.length > 0 && (
            <BookingSidebar
              packages={packages}
              providerName={name}
              selectedPackage={selectedPackage}
              onSelect={handleSelectPackage}
              providerId={providerId}
            />
          )}
        </div>
      </div>

      {/* Phones + tablets: sticky continue path reflecting the same selection. */}
      <BookingBottomBar selectedPackage={selectedPackage} providerId={providerId} />
    </>
  );
}
