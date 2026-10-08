import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { providers, servicePackages } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { DriveService } from "@/services/DriveService";
import { buildProviderSlug } from "@/lib/slug";
import { ExperienceLevel } from "@/types";

const VALID_TIERS = ["BASIC", "STANDARD", "PREMIUM"] as const;

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const userId = session.user.id;
    const existing = await db
      .select()
      .from(providers)
      .where(eq(providers.userId, userId))
      .then((rows) => rows[0]);

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Profile already exists" },
        { status: 409 },
      );
    }

    const body = await req.json();
    const {
      categorySlug,
      categoryFields,
      packages,
      coverVideoUrl,
      avatarUrl,
      driveFolderUrl,
    } = body;

    if (!categorySlug || !packages || !Array.isArray(packages)) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (packages.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one service package is required" },
        { status: 400 },
      );
    }

    for (const pkg of packages) {
      if (!VALID_TIERS.includes(pkg.tier)) {
        return NextResponse.json(
          { success: false, error: `Invalid package tier: ${pkg.tier}` },
          { status: 400 },
        );
      }
      if (!Number.isInteger(pkg.price) || pkg.price <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Package "${pkg.label}" price must be a positive amount`,
          },
          { status: 400 },
        );
      }
      if (!Number.isInteger(pkg.turnaroundDays) || pkg.turnaroundDays <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Package "${pkg.label}" turnaround days must be positive`,
          },
          { status: 400 },
        );
      }
    }

    const providerId = crypto.randomUUID();
    const slug = buildProviderSlug(session.user.name ?? "provider", providerId);

    const fields = categoryFields as Record<string, unknown> | undefined;

    await db.insert(providers).values({
      id: providerId,
      userId,
      categorySlug,
      displayName: session.user.name ?? "Provider",
      bio: (fields?.bio as string) ?? null,
      location: (fields?.location as string) ?? null,
      yearsActive: fields?.yearsActive ? parseInt(fields.yearsActive as string) : null,
      experienceLevel: (fields?.experienceLevel as ExperienceLevel) ?? null,
      categoryFields: fields ?? null,
      coverVideoUrl: coverVideoUrl ?? null,
      avatarUrl: avatarUrl ?? null,
      driveFolderUrl: driveFolderUrl ?? null,
      active: true,
    });

    for (const pkg of packages) {
      await db.insert(servicePackages).values({
        id: crypto.randomUUID(),
        providerId,
        tier: pkg.tier,
        label: pkg.label,
        price: pkg.price,
        deliverables: pkg.deliverables,
        turnaroundDays: pkg.turnaroundDays,
      });
    }

    // Best-effort: uploads made during onboarding happen BEFORE the provider
    // row exists, so the upload-time portfolio auto-attach silently skips
    // (attachUploadToProvider returns null with no provider profile). Without
    // this, the cover video only ever serves as the hero cover and never
    // appears in the portfolio, the explore content view, or provider tiles
    // that cycle content. Attach now that the provider id exists. Never fails
    // the setup itself; addItem is idempotent by URL.
    try {
      const { PortfolioService } = await import("@/services/PortfolioService");
      const { PortfolioItemSource } = await import("@/types");
      if (coverVideoUrl && typeof coverVideoUrl === "string" && coverVideoUrl.trim()) {
        const coverUrl = coverVideoUrl.trim();
        const isImage = /\.(jpe?g|png|webp|gif|avif|heic)$/i.test(coverUrl);
        let thumbnailUrl: string | undefined;
        if (!isImage) {
          try {
            const { generateVideoThumbnail } = await import("@/lib/cloudinary");
            thumbnailUrl = generateVideoThumbnail(coverUrl) || undefined;
          } catch {
            thumbnailUrl = undefined;
          }
        }
        await PortfolioService.addItem({
          providerId,
          source: PortfolioItemSource.DIRECT,
          url: coverUrl,
          thumbnailUrl,
          title: "Cover video",
          mimeType: isImage ? "image/jpeg" : "video/mp4",
        });
      }
      // Rescue any other library uploads the user made while onboarding.
      const { MediaAssetService } = await import("@/services/MediaAssetService");
      const orphans = await MediaAssetService.listByOwner(userId).catch(() => []);
      for (const asset of orphans.slice(0, 20)) {
        try {
          await PortfolioService.attachUploadToProvider(userId, {
            url: asset.url,
            thumbnailUrl: asset.thumbnailUrl,
            mimeType: asset.mimeType ?? "application/octet-stream",
            title: asset.publicId,
          });
        } catch {
          // Per-asset failures stay advisory — the profile already exists.
        }
      }
    } catch {
      // Portfolio surfacing is advisory — the profile already exists.
    }

    let driveSync: { ok: boolean; message?: string } | null = null;
    if (driveFolderUrl && typeof driveFolderUrl === "string") {
      try {
        const driveService = new DriveService();
        const result = await driveService.ingestFolder(providerId, driveFolderUrl);
        driveSync = {
          ok: true,
          message: `${result.added} item(s) synced from Drive`,
        };
      } catch (driveErr) {
        driveSync = {
          ok: false,
          message:
            driveErr instanceof Error
              ? driveErr.message
              : "Drive folder could not be synced",
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: { id: providerId, slug, driveSync },
    });
  } catch (err) {
    console.error("Profile setup failed:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}
