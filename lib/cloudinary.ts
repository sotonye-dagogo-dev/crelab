export interface UploadVideoResult {
  url: string;
  thumbnailUrl: string;
  duration: number;
}

export interface UploadImageResult {
  url: string;
}

export interface MediaUploadResult {
  url: string;
  thumbnailUrl: string | null;
  mimeType: string;
  resourceType: "video" | "image";
}

/**
 * Env vars are read at call time (not module load) so availability can be
 * evaluated correctly in tests and after runtime configuration changes.
 */
export function getCloudinaryCredentials(): {
  cloudName: string;
  uploadPreset: string;
} | null {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) return null;
  return { cloudName, uploadPreset };
}

/**
 * Cloudinary is only available when the required environment variables are
 * present. Features that depend on it must check this before offering uploads
 * and degrade gracefully (paste-link mode) when it returns false.
 */
export function isCloudinaryConfigured(): boolean {
  return getCloudinaryCredentials() !== null;
}

export class CloudinaryNotConfiguredError extends Error {
  status = 503;
  code = "CLOUDINARY_NOT_CONFIGURED" as const;
  constructor(message = "Cloudinary is not configured") {
    super(message);
    this.name = "CloudinaryNotConfiguredError";
  }
}

export function assertCloudinaryConfigured(): void {
  if (!isCloudinaryConfigured()) {
    throw new CloudinaryNotConfiguredError();
  }
}

export function getResourceType(mimeType: string): "video" | "image" | null {
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("image/")) return "image";
  return null;
}

function cloudinaryUrl(path: string): string {
  const creds = getCloudinaryCredentials();
  if (!creds) throw new CloudinaryNotConfiguredError();
  return `https://res.cloudinary.com/${creds.cloudName}/${path}`;
}

/**
 * Server-side upload. Requires NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and
 * NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET to be configured (unsigned preset).
 * Throws CloudinaryNotConfiguredError when env vars are absent.
 */
export async function uploadFile(
  file: File | Blob,
  mimeType?: string,
): Promise<MediaUploadResult> {
  assertCloudinaryConfigured();
  const creds = getCloudinaryCredentials()!;

  const resourceType = getResourceType(mimeType ?? file.type);
  if (!resourceType) {
    throw new Error(`Unsupported file type: ${file.type}`);
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", creds.uploadPreset);
  formData.append("resource_type", resourceType);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${creds.cloudName}/${resourceType}/upload`,
    { method: "POST", body: formData },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Cloudinary ${resourceType} upload failed: ${res.status} ${res.statusText}${body ? ` - ${body}` : ""}`,
    );
  }

  const data = await res.json();

  const url = data.secure_url as string;
  let thumbnailUrl: string | null = null;

  if (resourceType === "video") {
    const publicId = extractPublicId(url);
    thumbnailUrl = publicId
      ? cloudinaryUrl(`video/upload/w_600,q_auto,g_auto/${publicId}.jpg`)
      : url.replace(/\.(mp4|webm|mov|avi)$/i, ".jpg");
  }

  return { url, thumbnailUrl, mimeType: file.type, resourceType };
}

export async function uploadVideo(
  file: File | Blob,
): Promise<UploadVideoResult> {
  const result = await uploadFile(file, file.type);
  return {
    url: result.url,
    thumbnailUrl: result.thumbnailUrl ?? "",
    duration: 0,
  };
}

export function generateVideoThumbnail(videoUrl: string): string {
  const publicId = extractPublicId(videoUrl);
  if (publicId) {
    return cloudinaryUrl(`video/upload/w_600,q_auto,g_auto/${publicId}.jpg`);
  }
  return videoUrl.replace(/\.(mp4|webm|mov|avi)$/i, ".jpg");
}

export async function uploadImage(
  file: File | Blob,
): Promise<UploadImageResult> {
  const result = await uploadFile(file, file.type);
  return { url: result.url };
}

function extractPublicId(url: string): string | null {
  const match = url.match(
    /\/video\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/,
  );
  return match ? match[1] : null;
}
