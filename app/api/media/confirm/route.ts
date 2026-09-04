import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { DEFAULT_CONFIG } from "@/config/platform.config";
import { parseCloudinaryUrl, deleteAssetsByUrl, getResourceType } from "@/lib/cloudinary";
import { MediaAssetService } from "@/services/MediaAssetService";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Register a direct-to-Cloudinary upload.
 * The browser uploads straight to https://api.cloudinary.com (unsigned preset)
 * to bypass Vercel's ~4.5 MB payload limit; it then calls this endpoint to
 * create the `media_assets` row. Validates that the URL is a real Cloudinary
 * delivery URL and that the MIME/resource type matches the URL.
 *
 * ACID: if the DB insert fails, the cloud binary is deleted so we don't
 * leave an orphan. The delete is best-effort (admin credentials may be absent).
 */
export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }

    let config;
    try {
      config = await PlatformConfigService.getCached();
    } catch {
      config = DEFAULT_CONFIG;
    }
    const mediaUpload = config.mediaUpload ?? DEFAULT_CONFIG.mediaUpload!;

    if (!mediaUpload.enabled) {
      return NextResponse.json({ success: false, error: "Media uploads are currently disabled", code: "DISABLED" }, { status: 403 });
    }
    if (!mediaUpload.cloudinaryEnabled) {
      return NextResponse.json({ success: false, error: "Direct uploads are disabled. Paste a link or use Google Drive.", code: "CLOUDINARY_DISABLED" }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON body", code: "BAD_JSON" }, { status: 400 });
    }

    const b = body as Record<string, unknown>;
    const url = typeof b.url === "string" ? b.url.trim() : "";
    const publicId = typeof b.publicId === "string" ? b.publicId.trim() : "";
    const cloudName = typeof b.cloudName === "string" ? b.cloudName.trim() : "";
    const resourceTypeRaw = typeof b.resourceType === "string" ? b.resourceType.trim() : "";
    const mimeType = typeof b.mimeType === "string" ? b.mimeType.trim() : "";
    const thumbnailUrl = typeof b.thumbnailUrl === "string" ? b.thumbnailUrl.trim() : null;

    if (!url || !publicId || !cloudName || !resourceTypeRaw) {
      return NextResponse.json(
        { success: false, error: "url, publicId, cloudName and resourceType are required", code: "MISSING_FIELDS", details: ["Provide url, publicId, cloudName, resourceType"] },
        { status: 400 },
      );
    }

    const resourceType = resourceTypeRaw === "video" || resourceTypeRaw === "image" ? resourceTypeRaw : null;
    if (!resourceType) {
      return NextResponse.json({ success: false, error: "resourceType must be video or image", code: "BAD_RESOURCE_TYPE" }, { status: 400 });
    }

    // Validate URL shape — must be a Cloudinary URL for that asset
    const parsed = parseCloudinaryUrl(url);
    if (!parsed || parsed.publicId !== publicId || parsed.resourceType !== resourceType) {
      return NextResponse.json({ success: false, error: "URL does not match publicId/resourceType or is not a Cloudinary URL", code: "BAD_URL" }, { status: 400 });
    }

    // MIME must match resourceType
    const inferred = mimeType ? getResourceType(mimeType) : resourceType;
    if (inferred && inferred !== resourceType) {
      return NextResponse.json({ success: false, error: `MIME type ${mimeType} does not match resourceType ${resourceType}`, code: "MIME_MISMATCH" }, { status: 400 });
    }

    try {
      const asset = await MediaAssetService.recordUpload({
        publicId,
        cloudName,
        resourceType,
        url,
        thumbnailUrl: thumbnailUrl || null,
        mimeType: mimeType || `${resourceType}/unknown`,
        ownerId: session.user.id,
      });
      return NextResponse.json({ success: true, data: asset });
    } catch (err) {
      // Registration failed — clean up the orphan on Cloudinary (best-effort)
      await deleteAssetsByUrl([url]).catch(() => {});
      throw err;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
