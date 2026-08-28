import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { DEFAULT_CONFIG } from "@/config/platform.config";
import {
  uploadFile,
  CloudinaryNotConfiguredError,
  deleteAssetsByUrl,
} from "@/lib/cloudinary";
import { MediaAssetService } from "@/services/MediaAssetService";
import { isMediaFileAllowed } from "@/lib/media";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
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
        { success: false, error: "Direct uploads are disabled. Please paste a link instead or use Google Drive integration." },
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
      const baseError = validation.reason ?? "Invalid file";
      let suggestion = "";
      
      if (file.size > mediaUpload.maxFileSizeMb * 1024 * 1024) {
        suggestion = ` Consider using Google Drive integration for files larger than ${mediaUpload.maxFileSizeMb}MB.`;
      } else if (!mediaUpload.videoTypes.includes(file.type) && !mediaUpload.imageTypes.includes(file.type)) {
        suggestion = ` Supported formats: ${[...mediaUpload.videoTypes, ...mediaUpload.imageTypes].join(", ")}. Consider using Google Drive integration for other formats.`;
      }
      
      return NextResponse.json(
        { success: false, error: `${baseError}.${suggestion}` },
        { status: 400 },
      );
    }

    // Use generous timeout (10 minutes) for large files
    const result = await uploadFile(file, file.type, { timeoutMs: 10 * 60 * 1000 });

    let assetId: string | null = null;
    try {
      const asset = await MediaAssetService.recordUpload({
        publicId: result.publicId,
        cloudName: result.cloudName,
        resourceType: result.resourceType,
        url: result.url,
        thumbnailUrl: result.thumbnailUrl,
        mimeType: result.mimeType,
        ownerId: session.user.id,
      });
      assetId = asset.id;
    } catch {
      // Registration failed — the upload has no owner and would be orphaned.
      // Clean it up immediately so Cloudinary storage is not wasted.
      await deleteAssetsByUrl([result.url]).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      data: { ...result, assetId },
    });
  } catch (err) {
    if (err instanceof CloudinaryNotConfiguredError) {
      return NextResponse.json(
        { success: false, error: "Direct upload is not available. Please paste a link instead or use Google Drive integration." },
        { status: 503 },
      );
    }
    
    const errorMessage = err instanceof Error ? err.message : "Internal server error";
    
    // Enhance error messages for common issues
    let enhancedError = errorMessage;
    if (errorMessage.includes("timed out")) {
      enhancedError = `${errorMessage} For large files, consider using Google Drive integration which handles large uploads more reliably.`;
    } else if (errorMessage.includes("too large") || errorMessage.includes("413")) {
      enhancedError = `${errorMessage} Try reducing file size or use Google Drive integration.`;
    } else if (errorMessage.includes("Unsupported") || errorMessage.includes("format")) {
      enhancedError = `${errorMessage} Supported formats: MP4, WebM, MOV, AVI (video) and JPEG, PNG, WebP (images). You can also use Google Drive integration for broader format support.`;
    }
    
    return NextResponse.json(
      {
        success: false,
        error: enhancedError,
      },
      { status: 500 },
    );
  }
}
