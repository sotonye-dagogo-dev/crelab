import { NextResponse } from "next/server";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { DEFAULT_CONFIG } from "@/config/platform.config";
import {
  isCloudinaryConfigured,
  isCloudinaryAdminConfigured,
  getCloudinaryCredentials,
} from "@/lib/cloudinary";

export async function GET() {
  let config;
  try {
    config = await PlatformConfigService.getCached();
  } catch {
    config = DEFAULT_CONFIG;
  }

  const mediaUpload = config.mediaUpload ?? DEFAULT_CONFIG.mediaUpload!;

  const creds = getCloudinaryCredentials();
  // Expose the unsigned preset + cloudName so large files can upload
  // directly from the browser to Cloudinary, bypassing Vercel's ~4.5 MB
  // serverless payload limit. The preset is intentionally public (unsigned).
  const directUpload = creds
    ? {
        cloudName: creds.cloudName,
        uploadPreset: creds.uploadPreset,
      }
    : null;

  return NextResponse.json({
    success: true,
    data: {
      enabled: mediaUpload.enabled,
      cloudinaryConfigured:
        mediaUpload.enabled &&
        mediaUpload.cloudinaryEnabled &&
        isCloudinaryConfigured(),
      cloudinaryAdminConfigured:
        mediaUpload.enabled &&
        mediaUpload.cloudinaryEnabled &&
        isCloudinaryAdminConfigured(),
      cleanupEnabled: Boolean(mediaUpload.cleanupEnabled),
      cleanupOrphanAfterHours: mediaUpload.cleanupOrphanAfterHours ?? 0,
      maxFileSizeMb: mediaUpload.maxFileSizeMb,
      videoTypes: mediaUpload.videoTypes,
      imageTypes: mediaUpload.imageTypes,
      // For direct browser uploads (large files)
      directUpload,
    },
  });
}
