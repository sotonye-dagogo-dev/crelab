import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { providers, portfolioItems, servicePackages, reviews, user, bookings } from "@/drizzle/schema";
import { eq, and, asc } from "drizzle-orm";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { ProviderHero } from "@/components/profile/ProviderHero";
import { PortfolioGrid } from "@/components/profile/PortfolioGrid";
import { DrivePortfolioSection } from "@/components/profile/DrivePortfolioSection";
import { ServicePackages } from "@/components/profile/ServicePackages";
import { WorkHistory } from "@/components/profile/WorkHistory";
import { ReviewsSection } from "@/components/profile/ReviewsSection";
import { BookingSidebar } from "@/components/profile/BookingSidebar";
import { BookingBottomBar } from "@/components/profile/BookingBottomBar";
import type { IProvider, IServicePackage, IPortfolioItem } from "@/types";

interface Props {
  params: Promise<{ slug: string }>;
}

async function getProvider(slug: string) {
  const id = slug.split("-").pop();
  if (!id) return null;

  const provider = await db
    .select()
    .from(providers)
    .where(and(eq(providers.id, id), eq(providers.active, true)))
    .then((rows) => rows[0]);

  if (!provider) return null;

  return {
    ...provider,
    createdAt: provider.createdAt.toISOString(),
    updatedAt: provider.updatedAt.toISOString(),
  } as IProvider;
}

async function getPortfolioItems(providerId: string) {
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
}

async function getServicePackages(providerId: string) {
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
}

async function getReviews(providerId: string) {
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
}

async function getWorkHistory(providerId: string) {
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

  return bookingRows.map((row) => ({
    id: row.id,
    title: row.title,
    clientName: row.clientName,
    completedAt: row.completedAt.toISOString(),
    description: row.description ?? "",
  }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const platformConfig = await PlatformConfigService.getCached();
  const provider = await getProvider(slug);

  if (!provider) return { title: "Profile Not Found" };

  return {
    title: `${provider.displayName} | ${platformConfig.name}`,
    description: provider.bio ?? `Profile of ${provider.displayName}`,
  };
}

export default async function ProfilePage({ params }: Props) {
  const { slug } = await params;
  const provider = await getProvider(slug);

  if (!provider) notFound();

  const [portfolio, packages, reviewData, workHistory] = await Promise.all([
    getPortfolioItems(provider.id),
    getServicePackages(provider.id),
    getReviews(provider.id),
    getWorkHistory(provider.id),
  ]);

  const driveItems = portfolio.filter((item) => item.source === "DRIVE");
  const directItems = portfolio.filter((item) => item.source === "DIRECT");

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-[1200px] mx-auto px-4 py-6">
        <ProviderHero provider={provider} />

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

            <ServicePackages packages={packages} />
            <WorkHistory items={workHistory} />
            <ReviewsSection reviews={reviewData} />

            <div className="h-20 md:hidden" />
          </div>

          <div className="hidden lg:block">
            <BookingSidebar
              packages={packages}
              providerName={provider.displayName}
            />
          </div>
        </div>
      </div>

      <BookingBottomBar
        selectedPackage={packages[0] ?? null}
        onBook={() => {}}
      />
    </div>
  );
}
