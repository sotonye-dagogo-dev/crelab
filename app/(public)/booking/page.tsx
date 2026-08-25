import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { providers, servicePackages } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { MockDataService } from "@/services/MockDataService";
import { DEFAULT_CONFIG } from "@/config/platform.config";
import { BookingClient } from "./BookingClient";

interface Props {
  searchParams: Promise<{ provider?: string; package?: string }>;
}

async function getSessionUser() {
  try {
    const { requireAuth } = await import("@/lib/auth");
    const session = await requireAuth();
    return session.user;
  } catch {
    return null;
  }
}

async function getProvider(id: string): Promise<import("@/types").IProvider | null> {
  const mock = MockDataService.getMockProviderById(id);
  if (mock) return mock;

  try {
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
    } as import("@/types").IProvider;
  } catch {
    return null;
  }
}

async function getPackage(id: string, providerId: string): Promise<import("@/types").IServicePackage | null> {
  try {
    const pkg = await db
      .select()
      .from(servicePackages)
      .where(and(eq(servicePackages.id, id), eq(servicePackages.providerId, providerId)))
      .then((rows) => rows[0]);

    if (!pkg) return null;

    return {
      ...pkg,
      createdAt: pkg.createdAt.toISOString(),
      updatedAt: pkg.updatedAt.toISOString(),
    } as import("@/types").IServicePackage;
  } catch {
    return MockDataService.getMockServicePackages(providerId).find((p) => p.id === id) ?? null;
  }
}

export async function generateMetadata({ searchParams }: Props) {
  const { provider, package: packageId } = await searchParams;
  let platformConfig: import("@/types").IPlatformConfig;
  try {
    platformConfig = await PlatformConfigService.getCached();
  } catch {
    platformConfig = DEFAULT_CONFIG;
  }

  if (!provider || !packageId) {
    return { title: "Booking — " + platformConfig.name };
  }

  const [providerData, packageData] = await Promise.all([
    getProvider(provider),
    getPackage(packageId, provider),
  ]);

  if (!providerData || !packageData) {
    return { title: "Booking Not Found" };
  }

  const { buildSeoMetadata } = await import("@/lib/seo");
  return buildSeoMetadata(platformConfig, {
    title: `Book ${providerData.displayName} — ${packageData.label}`,
    description: `Book ${packageData.label} from ${providerData.displayName}`,
    path: `/booking?provider=${provider}&package=${packageId}`,
    ogType: "website",
    ogImage: providerData.avatarUrl ?? undefined,
  });
}

export default async function BookingPage({ searchParams }: Props) {
  const { provider, package: packageId } = await searchParams;
  const currentUser = await getSessionUser();

  if (!provider || !packageId) {
    return redirect("/explore");
  }

  const [providerData, packageData] = await Promise.all([
    getProvider(provider),
    getPackage(packageId, provider),
  ]);

  if (!providerData || !packageData) {
    notFound();
  }

  const isOwnProfile = currentUser && providerData.userId === currentUser.id;

  if (isOwnProfile) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)]">
        <div className="max-w-[600px] mx-auto px-4 py-12">
          <div className="text-center">
            <h1 className="font-[family-name:var(--font-display)] font-bold text-[28px] text-[var(--color-text-primary)]">
              This is Your Profile
            </h1>
            <p className="mt-4 text-[14px] text-[var(--color-text-secondary)]">
              You cannot book yourself. Visit your dashboard to manage your services.
            </p>
            <Link
              href="/dashboard"
              className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[var(--color-accent)] px-4 text-sm font-semibold text-[var(--color-text-inverse)] no-underline"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <BookingClient
        provider={providerData}
        package={packageData}
        currentUserId={currentUser?.id ?? null}
      />
    </div>
  );
}