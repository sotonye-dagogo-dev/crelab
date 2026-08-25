import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { providers, portfolioItems, servicePackages, reviews, user, bookings } from "@/drizzle/schema";
import { eq, and, asc, like } from "drizzle-orm";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { MockDataService } from "@/services/MockDataService";
import { DEFAULT_CONFIG } from "@/config/platform.config";
import { parseProviderSlug } from "@/lib/slug";
import { requireAuth } from "@/lib/auth";
import { ProviderHero } from "@/components/profile/ProviderHero";
import { PortfolioGrid } from "@/components/profile/PortfolioGrid";
import { DrivePortfolioSection } from "@/components/profile/DrivePortfolioSection";
import { WorkHistory } from "@/components/profile/WorkHistory";
import { ReviewsSection } from "@/components/profile/ReviewsSection";
import { BookingSidebarDisplay } from "@/components/profile/BookingSidebarDisplay";
import { ProfileClient } from "./ProfileClient";
import type { IProvider, IServicePackage, IPortfolioItem } from "@/types";

async function getSessionUser() {
  try {
    const session = await requireAuth();
    return session.user;
  } catch {
    return null;
  }
}

interface Props {
  params: Promise<{ slug: string }>;
}

async function getProvider(slug: string) {
  const mock = MockDataService.getMockProviderBySlug(slug);
  if (mock) return mock;

  const parsed = parseProviderSlug(slug);
  if (!parsed) return null;
  const idPrefix = parsed.idPrefix;

  try {
    const provider = await db
      .select()
      .from(providers)
      .where(and(like(providers.id, `${idPrefix}%`), eq(providers.active, true)))
      .then((rows) => rows[0]);

    if (!provider) return null;

    return {
      ...provider,
      createdAt: provider.createdAt.toISOString(),
      updatedAt: provider.updatedAt.toISOString(),
    } as IProvider;
  } catch {
    return null;
  }
}

async function getPortfolioItems(providerId: string) {
  try {
    const rows = await db
      .select()
      .from(portfolioItems)
      .where(
        and(
          eq(portfolioItems.providerId, providerId),
          eq(portfolioItems.visible, true),
        ),
      )
      .orderBy(asc(portfolioItems.orderIndex));

    return rows.map(
      (row) =>
        ({
          ...row,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        }) as IPortfolioItem,
    );
  } catch {
    return MockDataService.getMockPortfolioItems(providerId);
  }
}

async function getServicePackages(providerId: string) {
  try {
    const rows = await db
      .select()
      .from(servicePackages)
      .where(eq(servicePackages.providerId, providerId));

    return rows.map(
      (row) =>
        ({
          ...row,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        }) as IServicePackage,
    );
  } catch {
    return MockDataService.getMockServicePackages(providerId);
  }
}

async function getReviews(providerId: string) {
  try {
    const reviewRows = await db
      .select({
        id: reviews.id,
        bookingId: reviews.bookingId,
        reviewerId: reviews.reviewerId,
        providerId: reviews.providerId,
        rating: reviews.rating,
        body: reviews.body,
        createdAt: reviews.createdAt,
        reviewerName: user.name,
        reviewerAvatar: user.image,
      })
      .from(reviews)
      .innerJoin(user, eq(reviews.reviewerId, user.id))
      .where(eq(reviews.providerId, providerId))
      .orderBy(asc(reviews.createdAt));

    if (reviewRows.length === 0 && MockDataService.isEnabled()) {
      const mock = MockDataService.getMockReviewsForProvider(providerId);
      return mock.map((r) => ({
        ...r,
        reviewerName: "Verified Client",
        reviewerAvatar: null,
        verifiedBooking: true,
      }));
    }

    return reviewRows.map((row) => ({
      id: row.id,
      bookingId: row.bookingId,
      reviewerId: row.reviewerId,
      providerId: row.providerId,
      rating: row.rating,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      reviewerName: row.reviewerName,
      reviewerAvatar: row.reviewerAvatar,
      verifiedBooking: true,
    }));
  } catch {
    const mock = MockDataService.getMockReviewsForProvider(providerId);
    return mock.map((r) => ({
      ...r,
      reviewerName: "Verified Client",
      reviewerAvatar: null,
      verifiedBooking: true,
    }));
  }
}

async function getWorkHistory(providerId: string) {
  try {
    const bookingRows = await db
      .select({
        id: bookings.id,
        title: servicePackages.label,
        clientName: user.name,
        completedAt: bookings.updatedAt,
        description: bookings.scopeNotes,
      })
      .from(bookings)
      .innerJoin(servicePackages, eq(bookings.packageId, servicePackages.id))
      .innerJoin(user, eq(bookings.clientId, user.id))
      .where(
        and(
          eq(bookings.providerId, providerId),
          eq(bookings.status, "RELEASED"),
        ),
      )
      .orderBy(asc(bookings.updatedAt));

    if (bookingRows.length === 0 && MockDataService.isEnabled()) {
      return MockDataService.getMockWorkHistoryForProvider(providerId);
    }

    return bookingRows.map((row) => ({
      id: row.id,
      title: row.title,
      clientName: row.clientName,
      completedAt: row.completedAt.toISOString(),
      description: row.description ?? "",
    }));
  } catch {
    return MockDataService.getMockWorkHistoryForProvider(providerId);
  }
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  let platformConfig: import("@/types").IPlatformConfig;
  try {
    platformConfig = await PlatformConfigService.getCached();
  } catch {
    platformConfig = DEFAULT_CONFIG;
  }
  const provider = await getProvider(slug);

  if (!provider) return { title: "Profile Not Found" };

  const { buildSeoMetadata } = await import("@/lib/seo");
  return buildSeoMetadata(platformConfig, {
    title: provider.displayName,
    description: provider.bio ?? `Profile of ${provider.displayName}`,
    path: `/profile/${slug}`,
    ogType: "profile",
    ogImage: provider.avatarUrl ?? undefined,
  });
}

function ProfileContent({
  provider,
  portfolio,
  packages,
  reviewData,
  workHistory,
  isOwnProfile,
}: {
  provider: IProvider;
  portfolio: IPortfolioItem[];
  packages: IServicePackage[];
  reviewData: Awaited<ReturnType<typeof getReviews>>;
  workHistory: Awaited<ReturnType<typeof getWorkHistory>>;
  isOwnProfile: boolean;
}) {
  const driveItems = portfolio.filter((item) => item.source === "DRIVE");
  const directItems = portfolio.filter((item) => item.source === "DIRECT");

  return (
    <>
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
              <PortfolioGrid items={directItems} />
            </div>
          )}

          {driveItems.length > 0 && (
            <DrivePortfolioSection
              items={portfolio}
              providerName={provider.displayName}
            />
          )}

          <ProfileClient
            packages={packages}
            providerId={provider.id}
          />
          <WorkHistory items={workHistory} />
          <ReviewsSection reviews={reviewData} />

          <div className="h-20 md:hidden" />
        </div>

        <div className="hidden lg:block">
          {packages.length > 0 && (
            <BookingSidebarDisplay
              packages={packages}
              providerName={provider.displayName}
              providerId={provider.id}
            />
          )}
        </div>
      </div>
    </>
  );
}

export default async function ProfilePage({ params }: Props) {
  const { slug } = await params;
  const provider = await getProvider(slug);

  if (!provider) notFound();

  const currentUser = await getSessionUser();
  const isOwnProfile = currentUser && provider.userId === currentUser.id;

  const [portfolio, packages, reviewData, workHistory] = await Promise.all([
    getPortfolioItems(provider.id),
    getServicePackages(provider.id),
    getReviews(provider.id),
    getWorkHistory(provider.id),
  ]);

  if (isOwnProfile) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)]">
        <div className="max-w-[1200px] mx-auto px-4 py-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="font-[family-name:var(--font-display)] font-bold text-[24px] text-[var(--color-text-primary)]">
                Your Creator Profile
              </h1>
              <p className="text-[13px] text-[var(--color-text-secondary)] mt-1">
                Manage your profile and preview how it looks to clients
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[var(--color-border-mid)] bg-transparent px-4 text-sm font-semibold text-[var(--color-text-secondary)] no-underline transition-colors duration-150 hover:text-[var(--color-text-primary)] hover:border-[var(--color-accent)]"
              >
                Dashboard
              </Link>
              <Link
                href="/profile/setup"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[var(--color-accent)] px-4 text-sm font-semibold text-[var(--color-text-inverse)] no-underline transition-colors duration-150 hover:bg-[var(--color-accent-dim)]"
              >
                Edit Profile
              </Link>
              <Link
                href={`/profile/${slug}?preview=1`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[var(--color-success)] px-4 text-sm font-semibold text-[var(--color-text-inverse)] no-underline transition-colors duration-150 hover:opacity-90"
              >
                Preview Public Profile
              </Link>
            </div>
          </div>

          <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <div className="flex items-center gap-3 mb-4 p-3 rounded-[10px] bg-[var(--color-accent-muted)] border border-[var(--color-accent)]">
              <span className="w-2 h-2 rounded-full bg-[var(--color-success)]" />
              <span className="text-[13px] font-medium text-[var(--color-text-primary)]">
                You are viewing your own profile. Clients see the public version.
              </span>
            </div>
            <ProfileContent
              provider={provider}
              portfolio={portfolio}
              packages={packages}
              reviewData={reviewData}
              workHistory={workHistory}
              isOwnProfile
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-[1200px] mx-auto px-4 py-6">
        <ProfileContent
          provider={provider}
          portfolio={portfolio}
          packages={packages}
          reviewData={reviewData}
          workHistory={workHistory}
          isOwnProfile={false}
        />
      </div>
    </div>
  );
}
