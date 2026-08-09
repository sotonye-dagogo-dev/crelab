import { NextResponse } from "next/server";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { DEFAULT_CONFIG } from "@/config/platform.config";
import { isCloudinaryConfigured } from "@/lib/cloudinary";

export async function GET() {
  let config;
  try {
    config = await PlatformConfigService.getCached();
  } catch {
    config = DEFAULT_CONFIG;
  }

  const mediaUpload = config.mediaUpload ?? DEFAULT_CONFIG.mediaUpload!;

  return NextResponse.json({
    success: true,
    data: {
      enabled: mediaUpload.enabled,
      cloudinaryConfigured:
        mediaUpload.enabled &&
        mediaUpload.cloudinaryEnabled &&
        isCloudinaryConfigured(),
      maxFileSizeMb: mediaUpload.maxFileSizeMb,
      videoTypes: mediaUpload.videoTypes,
      imageTypes: mediaUpload.imageTypes,
    },
  });
}
