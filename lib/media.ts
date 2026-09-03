import type { IMediaUploadConfig } from "@/types";

export interface FileValidationResult {
  ok: boolean;
  reason: string | null;
}

// Extended supported media types with more generous format support
export const ACCEPTED_MEDIA_TYPES = [
  // Video formats
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
  "video/3gpp",
  "video/3gpp2",
  "video/x-flv",
  "video/mpeg",
  // Image formats
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/heic",
  "image/heif",
];

export function getAcceptedTypes(config: IMediaUploadConfig): string[] {
  return [...config.videoTypes, ...config.imageTypes];
}

export function isMediaFileAllowed(
  file: { name: string; size: number; type: string },
  config: IMediaUploadConfig,
): FileValidationResult {
  const maxBytes = config.maxFileSizeMb * 1024 * 1024;

  if (file.size === 0) {
    return { ok: false, reason: "File is empty (0 bytes). Please re-select the file" };
  }
  if (file.size > maxBytes) {
    return {
      ok: false,
      reason: `File is ${(file.size / 1024 / 1024).toFixed(1)} MB — exceeds the ${config.maxFileSizeMb} MB per-file limit (each file is judged individually). Compress the file or use Google Drive for larger files.`,
    };
  }

  // When MIME is missing (some browsers / drag-drop edge cases) infer from extension
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const accepted = getAcceptedTypes(config);

  if (!file.type) {
    if (extension) {
      const inferred = mimeFromExtension(extension);
      if (inferred && accepted.includes(inferred)) {
        // Allow it — Cloudinary will detect correctly; extension mapping covers it
        return { ok: true, reason: null };
      }
    }
    return { ok: false, reason: "Could not determine the file type. Check the file extension or try a different format. Supported: " + accepted.join(", ") };
  }

  if (!accepted.includes(file.type)) {
    // Before rejecting, check if extension maps to a supported type — some browsers report generic types
    if (extension) {
      const inferred = mimeFromExtension(extension);
      if (inferred && accepted.includes(inferred)) return { ok: true, reason: null };
    }
    return {
      ok: false,
      reason: `${file.type} is not supported. Upload a ${accepted.join(", ")} file instead. For other formats, use Google Drive.`,
    };
  }

  // Additional validation: check file extension matches MIME type (warn, don't block when extension missing)
  if (extension && !isExtensionAllowedForType(extension, file.type)) {
    return {
      ok: false,
      reason: `File extension .${extension} doesn't match the detected file type (${file.type}). Please check the file and try again.`,
    };
  }

  return { ok: true, reason: null };
}

function mimeFromExtension(ext: string): string | null {
  const map: Record<string, string> = {
    mp4: "video/mp4", m4v: "video/mp4", webm: "video/webm", mov: "video/quicktime", qt: "video/quicktime",
    avi: "video/x-msvideo", mkv: "video/x-matroska", "3gp": "video/3gpp", "3g2": "video/3gpp2", flv: "video/x-flv",
    mpeg: "video/mpeg", mpg: "video/mpeg", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    webp: "image/webp", gif: "image/gif", avif: "image/avif", heic: "image/heic", heif: "image/heif",
  };
  return map[ext] ?? null;
}

function isExtensionAllowedForType(extension: string, mimeType: string): boolean {
  const extensionMap: Record<string, string[]> = {
    "video/mp4": ["mp4", "m4v", "mp4v"],
    "video/webm": ["webm"],
    "video/quicktime": ["mov", "qt"],
    "video/x-msvideo": ["avi"],
    "video/x-matroska": ["mkv", "mk3d", "mks"],
    "video/3gpp": ["3gp", "3gpp"],
    "video/3gpp2": ["3g2", "3gp2"],
    "video/x-flv": ["flv", "f4v"],
    "video/mpeg": ["mpeg", "mpg", "mpe", "m1v", "m2v"],
    "image/jpeg": ["jpg", "jpeg", "jpe", "jfif"],
    "image/png": ["png", "apng"],
    "image/webp": ["webp"],
    "image/gif": ["gif"],
    "image/avif": ["avif"],
    "image/heic": ["heic", "heif"],
    "image/heif": ["heif", "heic"],
  };
  
  const allowedExtensions = extensionMap[mimeType];
  if (!allowedExtensions) return true; // Unknown mime type, allow it
  return allowedExtensions.includes(extension);
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
