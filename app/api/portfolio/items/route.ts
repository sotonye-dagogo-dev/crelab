import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { PortfolioService } from "@/services/PortfolioService";
import { PortfolioItemSource } from "@/types";
import { db } from "@/lib/db";
import { providers } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (session.user.role !== "PROVIDER" && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Forbidden: providers only" },
        { status: 403 },
      );
    }

    const provider = await db
      .select()
      .from(providers)
      .where(eq(providers.userId, session.user.id))
      .then((rows) => rows[0]);

    if (!provider) {
      return NextResponse.json(
        { success: false, error: "Provider profile not found" },
        { status: 404 },
      );
    }

    const items = await PortfolioService.getAllByProvider(provider.id);

    return NextResponse.json({ success: true, data: items });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Attach an asset to the caller's provider portfolio. Accepts either a
 * `mediaAssetId` (a row in the uploader's media library) or a raw `url` +
 * `mimeType` pair (e.g. a pasted Drive/public link). Idempotent: re-attaching
 * the same URL returns the existing portfolio item instead of a duplicate —
 * so the explore content view and provider portfolios can never show the same
 * asset twice from repeated attaches.
 */
export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (session.user.role !== "PROVIDER" && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Forbidden: providers only" },
        { status: 403 },
      );
    }

    const provider = await db
      .select()
      .from(providers)
      .where(eq(providers.userId, session.user.id))
      .then((rows) => rows[0]);

    if (!provider) {
      return NextResponse.json(
        { success: false, error: "Provider profile not found" },
        { status: 404 },
      );
    }

    const body = await req.json().catch(() => null);
    const b = (body ?? {}) as Record<string, unknown>;

    let url = typeof b.url === "string" ? b.url.trim() : "";
    let thumbnailUrl = typeof b.thumbnailUrl === "string" ? b.thumbnailUrl.trim() : null;
    let mimeType = typeof b.mimeType === "string" ? b.mimeType.trim() : "";
    const title = typeof b.title === "string" ? b.title.trim() : undefined;

    if (typeof b.mediaAssetId === "string" && b.mediaAssetId.trim() && !url) {
      const { MediaAssetService } = await import("@/services/MediaAssetService");
      const asset = await MediaAssetService.getById(b.mediaAssetId.trim());
      if (!asset) {
        return NextResponse.json(
          { success: false, error: "Media asset not found" },
          { status: 404 },
        );
      }
      if (asset.ownerId && asset.ownerId !== session.user.id && session.user.role !== "ADMIN") {
        return NextResponse.json(
          { success: false, error: "Forbidden: you do not own this asset" },
          { status: 403 },
        );
      }
      url = asset.url;
      thumbnailUrl = asset.thumbnailUrl;
      mimeType = asset.mimeType ?? mimeType;
    }

    if (!url) {
      return NextResponse.json(
        { success: false, error: "Provide mediaAssetId or url" },
        { status: 400 },
      );
    }
    if (!mimeType) mimeType = "application/octet-stream";

    const item = await PortfolioService.addItem({
      providerId: provider.id,
      source: PortfolioItemSource.DIRECT,
      url,
      thumbnailUrl: thumbnailUrl || undefined,
      title,
      mimeType,
    });

    return NextResponse.json({ success: true, data: item });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}