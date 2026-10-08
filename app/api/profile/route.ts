import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { providers, servicePackages, portfolioItems } from "@/drizzle/schema";
import { eq, asc } from "drizzle-orm";
import { buildProviderSlug } from "@/lib/slug";

/**
 * PATCH — update the current user's provider display picture (avatarUrl).
 * Non-breaking additive endpoint: 404 when the caller has no provider profile
 * (auth-level `user.image` is updated client-side via Better Auth instead).
 * Accepts `{ avatarUrl: string | null }`; empty string clears to null.
 */
export async function PATCH(req: Request) {
  try {
    const session = await requireAuth();
    const body = await req.json().catch(() => null);
    const raw = body?.avatarUrl;
    if (raw !== undefined && raw !== null && typeof raw !== "string") {
      return NextResponse.json(
        { success: false, error: "avatarUrl must be a string or null" },
        { status: 400 },
      );
    }
    const avatarUrl =
      typeof raw === "string" && raw.trim() ? raw.trim() : null;

    const existing = await db
      .select({ id: providers.id })
      .from(providers)
      .where(eq(providers.userId, session.user.id))
      .then((rows) => rows[0]);

    if (!existing) {
      return NextResponse.json(
        { success: true, data: null, message: "No provider profile — auth avatar only" },
        { status: 404 },
      );
    }

    await db
      .update(providers)
      .set({ avatarUrl })
      .where(eq(providers.id, existing.id));

    return NextResponse.json({ success: true, data: { avatarUrl } });
  } catch (err) {
    const message =
      err instanceof Error && err.message === "Unauthorized"
        ? "Unauthorized"
        : err instanceof Error
          ? err.message
          : "Internal server error";
    return NextResponse.json(
      { success: false, error: message },
      { status: message === "Unauthorized" ? 401 : 500 },
    );
  }
}

/**
 * Returns the current user's provider (creator) profile state — or null when
 * they don't have one. Used by creator-facing pages (media, dashboard) to know
 * whether Drive sync / portfolio tools are available. Admin accounts can also
 * hold a provider profile, so this is role-agnostic.
 */
export async function GET() {
  try {
    const session = await requireAuth();

    const provider = await db
      .select()
      .from(providers)
      .where(eq(providers.userId, session.user.id))
      .then((rows) => rows[0]);

    if (!provider) {
      return NextResponse.json({ success: true, data: null });
    }

    const [packages, portfolio] = await Promise.all([
      db
        .select()
        .from(servicePackages)
        .where(eq(servicePackages.providerId, provider.id))
        .orderBy(asc(servicePackages.tier)),
      db
        .select()
        .from(portfolioItems)
        .where(eq(portfolioItems.providerId, provider.id))
        .orderBy(asc(portfolioItems.orderIndex)),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        id: provider.id,
        slug: buildProviderSlug(
          provider.displayName ?? session.user.name ?? "provider",
          provider.id,
        ),
        displayName: provider.displayName,
        categorySlug: provider.categorySlug,
        coverVideoUrl: provider.coverVideoUrl,
        avatarUrl: provider.avatarUrl,
        driveFolderUrl: provider.driveFolderUrl,
        active: provider.active,
        verified: provider.verified,
        bio: provider.bio,
        packages: packages.map((p) => ({
          id: p.id,
          tier: p.tier,
          label: p.label,
          price: p.price,
          deliverables: p.deliverables,
          turnaroundDays: p.turnaroundDays,
        })),
        portfolio: portfolio.map((p) => ({
          id: p.id,
          source: p.source,
          url: p.url,
          thumbnailUrl: p.thumbnailUrl,
          title: p.title,
          caption: p.caption,
          mimeType: p.mimeType,
          orderIndex: p.orderIndex,
          visible: p.visible,
        })),
      },
    });
  } catch (err) {
    const message =
      err instanceof Error && err.message === "Unauthorized"
        ? "Unauthorized"
        : err instanceof Error
          ? err.message
          : "Internal server error";
    return NextResponse.json(
      { success: false, data: null, error: message },
      { status: message === "Unauthorized" ? 401 : 500 },
    );
  }
}