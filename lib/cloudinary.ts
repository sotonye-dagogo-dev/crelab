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
  /** Cloudinary public id — used for cleanup/deletion */
  publicId: string;
  cloudName: string;
}

export interface CloudinaryCredentials {
  cloudName: string;
  uploadPreset: string;
  apiKey: string | null;
  apiSecret: string | null;
}

const CLOUDINARY_UPLOAD_HOST = "https://api.cloudinary.com/v1_1";

/**
 * Env vars are read at call time (not module load) so availability can be
 * evaluated correctly in tests and after runtime configuration changes.
 *
 * New conventional variables (server-side):
 *   CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET / CLOUDINARY_UPLOAD_PRESET
 *
 * The legacy NEXT_PUBLIC_CLOUDINARY_* pair is still honoured as a fallback so
 * existing deployments keep working after the upgrade.
 */
export function getCloudinaryCredentials(): CloudinaryCredentials | null {
  const cloudName =
    process.env.CLOUDINARY_CLOUD_NAME ??
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset =
    process.env.CLOUDINARY_UPLOAD_PRESET ??
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  const apiKey = process.env.CLOUDINARY_API_KEY ?? null;
  const apiSecret = process.env.CLOUDINARY_API_SECRET ?? null;
  if (!cloudName || !uploadPreset) return null;
  return { cloudName, uploadPreset, apiKey, apiSecret };
}

/**
 * Cloudinary uploads are only available when the cloud name and an upload
 * preset are present. Features that depend on uploads must check this before
 * offering them and degrade gracefully (paste-link mode) when it returns false.
 */
export function isCloudinaryConfigured(): boolean {
  return getCloudinaryCredentials() !== null;
}

/**
 * Admin operations (delete / cleanup) additionally require the API key and
 * API secret. Asset management features must gate on this and degrade
 * gracefully (registry-only, no binary deletion) when it returns false.
 */
export function isCloudinaryAdminConfigured(): boolean {
  const creds = getCloudinaryCredentials();
  return Boolean(creds && creds.apiKey && creds.apiSecret);
}

export class CloudinaryNotConfiguredError extends Error {
  status = 503;
  code = "CLOUDINARY_NOT_CONFIGURED" as const;
  constructor(message = "Cloudinary is not configured") {
    super(message);
    this.name = "CloudinaryNotConfiguredError";
  }
}

export class CloudinaryAdminNotConfiguredError extends Error {
  status = 503;
  code = "CLOUDINARY_ADMIN_NOT_CONFIGURED" as const;
  constructor(
    message = "Cloudinary admin credentials (API key + secret) are not configured",
  ) {
    super(message);
    this.name = "CloudinaryAdminNotConfiguredError";
  }
}

export function assertCloudinaryConfigured(): void {
  if (!isCloudinaryConfigured()) {
    throw new CloudinaryNotConfiguredError();
  }
}

export function assertCloudinaryAdminConfigured(): void {
  if (!isCloudinaryAdminConfigured()) {
    throw new CloudinaryAdminNotConfiguredError();
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
 * Server-side upload. Requires the cloud name and an upload preset. Throws
 * CloudinaryNotConfiguredError when env vars are absent. Returns the
 * Cloudinary public id so callers can register/decommission the asset.
 */
export async function uploadFile(
  file: File | Blob,
  mimeType?: string,
  options?: { timeoutMs?: number; onProgress?: (progress: number) => void }
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

  // Default to 10 minutes timeout for large files
  const timeoutMs = options?.timeoutMs ?? 10 * 60 * 1000;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(
      `${CLOUDINARY_UPLOAD_HOST}/${creds.cloudName}/${resourceType}/upload`,
      {
        method: "POST",
        body: formData,
        signal: controller.signal,
      },
    );

    clearTimeout(timeoutId);

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const errorMsg = `Cloudinary ${resourceType} upload failed: ${res.status} ${res.statusText}${body ? ` - ${body}` : ""}`;
      
      // Provide more specific error messages based on status code
      if (res.status === 413 || res.status === 400) {
        throw new Error(`${errorMsg}. File may be too large or in an unsupported format. Consider using Google Drive integration for larger files.`);
      }
      if (res.status === 429) {
        throw new Error(`${errorMsg}. Rate limit exceeded. Please try again later.`);
      }
      throw new Error(errorMsg);
    }

    const data = await res.json();

    const url = data.secure_url as string;
    const publicId = (data.public_id as string) ?? extractPublicId(url) ?? "";
    let thumbnailUrl: string | null = null;

    if (resourceType === "video") {
      thumbnailUrl = publicId
        ? cloudinaryUrl(`video/upload/w_600,q_auto,g_auto/${publicId}.jpg`)
        : url.replace(/\.(mp4|webm|mov|avi)$/i, ".jpg");
    }

    return {
      url,
      thumbnailUrl,
      mimeType: file.type,
      resourceType,
      publicId,
      cloudName: creds.cloudName,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(`Upload timed out after ${timeoutMs / 1000 / 60} minutes. For large files, consider using Google Drive integration instead.`);
    }
    throw err;
  }
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
  const parsed = parseCloudinaryUrl(videoUrl);
  if (parsed) {
    return cloudinaryUrl(
      `video/upload/w_600,q_auto,g_auto/${encodeURIComponent(parsed.publicId)}.jpg`,
    );
  }
  return videoUrl.replace(/\.(mp4|webm|mov|avi)$/i, ".jpg");
}

export async function uploadImage(
  file: File | Blob,
): Promise<UploadImageResult> {
  const result = await uploadFile(file, file.type);
  return { url: result.url };
}

export interface ParsedCloudinaryAsset {
  cloudName: string;
  resourceType: "video" | "image";
  publicId: string;
}

/**
 * Parse a Cloudinary delivery URL into its cloud, resource type and public id.
 * Handles signed URLs, versions (`v123`) and transformation segments
 * (`w_600,q_auto,g_auto/...`), which appear on thumbnail URLs.
 */
export function parseCloudinaryUrl(url: string): ParsedCloudinaryAsset | null {
  const match = url.match(
    /res\.cloudinary\.com\/([^/]+)\/(video|image)\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/,
  );
  if (!match) return null;

  const segments = match[3].split("/");
  const last = segments[segments.length - 1];
  if (!last) return null;

  const publicId = last.replace(/\.\w+$/, "");
  if (!publicId) return null;

  return { cloudName: match[1], resourceType: match[2] as "video" | "image", publicId };
}

/**
 * Backwards-compatible alias kept for existing callers.
 */
export function extractPublicId(url: string): string | null {
  return parseCloudinaryUrl(url)?.publicId ?? null;
}

function adminHeaders(): HeadersInit {
  const creds = getCloudinaryCredentials();
  if (!creds?.apiKey || !creds.apiSecret) {
    throw new CloudinaryAdminNotConfiguredError();
  }
  const basic = Buffer.from(`${creds.apiKey}:${creds.apiSecret}`).toString(
    "base64",
  );
  return { Authorization: `Basic ${basic}` };
}

/**
 * Delete a single Cloudinary asset by public id. Requires the admin API key
 * and secret. Returns true when the asset no longer exists on Cloudinary
 * (either deleted or already absent).
 */
export async function deleteAsset(
  publicId: string,
  resourceType: "video" | "image",
  cloudName?: string,
): Promise<boolean> {
  const creds = getCloudinaryCredentials();
  const cn = cloudName ?? creds?.cloudName;
  if (!cn) throw new CloudinaryNotConfiguredError();

  const encoded = encodeURIComponent(publicId);
  const res = await fetch(
    `${CLOUDINARY_UPLOAD_HOST}/${cn}/resources/${resourceType}/upload/${encoded}`,
    { method: "DELETE", headers: adminHeaders() },
  );

  if (res.status === 404) return true;
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Cloudinary delete failed for ${publicId}: ${res.status} ${res.statusText}${body ? ` - ${body}` : ""}`,
    );
  }
  return true;
}

/**
 * Delete one or more Cloudinary assets from their delivery URLs (or public
 * ids). Non-Cloudinary URLs are skipped. Requires admin credentials.
 */
export async function deleteAssetsByUrl(urls: string[]): Promise<number> {
  let deleted = 0;
  for (const url of urls) {
    const parsed = url && parseCloudinaryUrl(url);
    if (!parsed) continue;
    await deleteAsset(parsed.publicId, parsed.resourceType, parsed.cloudName);
    deleted++;
  }
  return deleted;
}
