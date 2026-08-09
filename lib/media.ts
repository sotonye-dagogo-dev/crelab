import type { IMediaUploadConfig } from "@/types";

export interface FileValidationResult {
  ok: boolean;
  reason: string | null;
}

export const ACCEPTED_MEDIA_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "image/jpeg",
  "image/png",
  "image/webp",
];

export function getAcceptedTypes(config: IMediaUploadConfig): string[] {
  return [...config.videoTypes, ...config.imageTypes];
}

export function isMediaFileAllowed(
  file: { name: string; size: number; type: string },
  config: IMediaUploadConfig,
): FileValidationResult {
  const maxBytes = config.maxFileSizeMb * 1024 * 1024;

  if (!file.type) {
    return { ok: false, reason: "Could not determine the file type" };
  }

  const accepted = getAcceptedTypes(config);
  if (!accepted.includes(file.type)) {
    return {
      ok: false,
      reason: `${file.type} is not supported. Upload a ${accepted.join(", ")} file instead.`,
    };
  }

  if (file.size > maxBytes) {
    return {
      ok: false,
      reason: `File is too large. Maximum size is ${config.maxFileSizeMb}MB.`,
    };
  }

  return { ok: true, reason: null };
}

/** Basic URL sanity check for a pasted public media link. */
export function isValidMediaUrl(value: string): boolean {
  if (!value.trim()) return false;
  try {
    const url = new URL(value.trim());
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}
