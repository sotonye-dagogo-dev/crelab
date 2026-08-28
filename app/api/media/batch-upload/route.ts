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

interface BatchUploadResult {
  assetId: string;
  url: string;
  thumbnailUrl: string | null;
  mimeType: string;
  resourceType: "video" | "image";
  publicId: string;
  fileName: string;
}

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
    const files = formData.getAll("files") as File[];

    if (!files.length) {
      return NextResponse.json(
        { success: false, error: "At least one file is required" },
        { status: 400 },
      );
    }

    if (files.length > 5) {
      return NextResponse.json(
        { success: false, error: "Maximum 5 files allowed per upload batch" },
        { status: 400 },
      );
    }

    // Validate all files first before any uploads
    const validationErrors: string[] = [];
    for (const file of files) {
      if (!(file instanceof File)) {
        validationErrors.push(`Invalid file object: ${String(file)}`);
        continue;
      }
      const validation = isMediaFileAllowed(file, mediaUpload);
      if (!validation.ok) {
        let suggestion = "";
        if (file.size > mediaUpload.maxFileSizeMb * 1024 * 1024) {
          suggestion = ` Consider using Google Drive integration for files larger than ${mediaUpload.maxFileSizeMb}MB.`;
        } else if (!mediaUpload.videoTypes.includes(file.type) && !mediaUpload.imageTypes.includes(file.type)) {
          suggestion = ` Supported formats: ${[...mediaUpload.videoTypes, ...mediaUpload.imageTypes].join(", ")}. Consider using Google Drive integration for other formats.`;
        }
        validationErrors.push(`${file.name}: ${validation.reason}.${suggestion}`);
      }
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: validationErrors },
        { status: 400 },
      );
    }

    // Upload all files with ACID compliance - track all successful uploads for cleanup on failure
    const successfulUploads: BatchUploadResult[] = [];
    const uploadErrors: string[] = [];

    for (const file of files) {
      try {
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
          // Registration failed — clean up the upload
          await deleteAssetsByUrl([result.url]).catch(() => {});
          throw new Error(`Failed to register asset for ${file.name}`);
        }

        successfulUploads.push({
          assetId: assetId!,
          url: result.url,
          thumbnailUrl: result.thumbnailUrl,
          mimeType: result.mimeType,
          resourceType: result.resourceType,
          publicId: result.publicId,
          fileName: file.name,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : `Failed to upload ${file.name}`;
        uploadErrors.push(errorMessage);
        
        // ACID compliance: cleanup all successfully uploaded files from this batch
        if (successfulUploads.length > 0) {
          const urlsToDelete = successfulUploads.map(u => u.url);
          await deleteAssetsByUrl(urlsToDelete).catch(() => {});
          // Also try to delete the media asset records
          for (const upload of successfulUploads) {
            try {
              await MediaAssetService.deleteAsset(upload.assetId);
            } catch {
              // Ignore cleanup errors
            }
          }
          successfulUploads.length = 0;
        }
        break; // Stop processing remaining files on first failure
      }
    }

    if (uploadErrors.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Batch upload failed",
          details: uploadErrors 
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: successfulUploads,
    });
  } catch (err) {
    if (err instanceof CloudinaryNotConfiguredError) {
      return NextResponse.json(
        { success: false, error: "Direct upload is not available. Please paste a link instead or use Google Drive integration." },
        { status: 503 },
      );
    }
    
    const errorMessage = err instanceof Error ? err.message : "Internal server error";
    
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