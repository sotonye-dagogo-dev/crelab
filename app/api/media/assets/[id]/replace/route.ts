import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { DEFAULT_CONFIG } from "@/config/platform.config";
import { uploadFile, CloudinaryNotConfiguredError } from "@/lib/cloudinary";
import { MediaAssetService } from "@/services/MediaAssetService";
import { isMediaFileAllowed } from "@/lib/media";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const asset = await MediaAssetService.getById(id);
    if (!asset) {
      return NextResponse.json(
        { success: false, error: "Media asset not found" },
        { status: 404 },
      );
    }
    if (asset.ownerId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    let config;
    try {
      config = await PlatformConfigService.getCached();
    } catch {
      config = DEFAULT_CONFIG;
    }
    const mediaUpload = config.mediaUpload ?? DEFAULT_CONFIG.mediaUpload!;

    if (!mediaUpload.enabled) {
      return NextResponse.json(
        { success: false, error: "Media uploads are currently disabled" },
        { status: 403 },
      );
    }
    if (!mediaUpload.cloudinaryEnabled) {
      return NextResponse.json(
        { success: false, error: "Direct uploads are disabled" },
        { status: 403 },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "file is required" },
        { status: 400 },
      );
    }

    const validation = isMediaFileAllowed(file, mediaUpload);
    if (!validation.ok) {
      return NextResponse.json(
        { success: false, error: validation.reason ?? "Invalid file" },
        { status: 400 },
      );
    }

    const result = await uploadFile(file, file.type);

    const { asset: newAsset, referencesUpdated } =
      await MediaAssetService.replaceAsset(id, {
        publicId: result.publicId,
        cloudName: result.cloudName,
        resourceType: result.resourceType,
        url: result.url,
        thumbnailUrl: result.thumbnailUrl,
        mimeType: result.mimeType,
      });

    return NextResponse.json({
      success: true,
      data: { asset: newAsset, referencesUpdated },
    });
  } catch (err) {
    if (err instanceof CloudinaryNotConfiguredError) {
      return NextResponse.json(
        { success: false, error: "Direct upload is not available" },
        { status: 503 },
      );
    }
    if (err instanceof Error && err.message === "Media asset not found") {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
