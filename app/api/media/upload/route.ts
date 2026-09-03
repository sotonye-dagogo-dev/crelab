import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { DEFAULT_CONFIG } from "@/config/platform.config";
import { uploadFile, CloudinaryNotConfiguredError, deleteAssetsByUrl } from "@/lib/cloudinary";
import { MediaAssetService } from "@/services/MediaAssetService";
import { isMediaFileAllowed } from "@/lib/media";

export const runtime = "nodejs";
export const maxDuration = 300;

function toMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const hint = msg.includes("413") || msg.includes("too large") || msg.includes("Body exceeded")
        ? " The file may exceed the server proxy limit (≈4.5 MB on some hosts). Your browser will automatically retry a direct upload to Cloudinary — or use Google Drive for very large files."
        : "";
      return NextResponse.json({ success: false, error: `Could not read upload: ${msg}.${hint}`, code: "FORM_PARSE_FAILED" }, { status: 413 });
    }

    // Accept "file" or "files" or any File entry (defensive)
    let file: File | null = null;
    const candidate = formData.get("file");
    if (candidate instanceof File) file = candidate;
    else {
      const many = formData.getAll("files") as unknown[];
      const found = many.find((v): v is File => v instanceof File && v.size > 0) ?? null;
      if (found) file = found;
      else {
        for (const v of formData.values()) {
          if (v instanceof File && v.size > 0) { file = v; break; }
        }
        // if only empty file present, keep it so we can return actionable 0-byte error
        if (!file) {
          for (const v of formData.values()) if (v instanceof File) { file = v; break; }
        }
      }
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "file is required", code: "NO_FILE", details: ["No file field received — the form field should be named 'file' (or 'files')."] },
        { status: 400 },
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { success: false, error: "File is empty (0 bytes). Please re-select the file and try again. If it was truncated in transit, try the direct upload or Google Drive.", code: "EMPTY_FILE" },
        { status: 400 },
      );
    }

    const validation = isMediaFileAllowed(file, mediaUpload);
    if (!validation.ok) {
      const base = validation.reason ?? "Invalid file";
      let suggestion = "";
      if (file.size > mediaUpload.maxFileSizeMb * 1024 * 1024) {
        suggestion = ` File is ${toMb(file.size)} (limit ${mediaUpload.maxFileSizeMb} MB per file — each file is judged individually, not the batch total). Compress the file or use Google Drive, which handles large files better.`;
      } else if (!mediaUpload.videoTypes.includes(file.type) && !mediaUpload.imageTypes.includes(file.type)) {
        suggestion = ` Supported: ${[...mediaUpload.videoTypes, ...mediaUpload.imageTypes].join(", ")}.`;
      }
      return NextResponse.json({ success: false, error: `${base}.${suggestion}`, code: "VALIDATION_FAILED", details: [`${file.name}: ${base}`] }, { status: 400 });
    }

    let result: Awaited<ReturnType<typeof uploadFile>>;
    try {
      result = await uploadFile(file, file.type, { timeoutMs: 10 * 60 * 1000 });
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      let enhanced = raw;
      if (raw.includes("timed out")) enhanced = `${raw} For large files, the direct browser upload usually succeeds where the server proxy times out — the client will try that automatically. Otherwise use Google Drive.`;
      else if (raw.includes("too large") || raw.includes("413")) enhanced = `${raw} File is ${toMb(file.size)} (limit ${mediaUpload.maxFileSizeMb} MB each). Compress or use Drive.`;
      throw new Error(enhanced);
    }

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
      await deleteAssetsByUrl([result.url]).catch(() => {});
      return NextResponse.json({ success: false, error: "Uploaded to Cloudinary but could not register the asset. The upload was cleaned up — please try again.", code: "REGISTER_FAILED" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { ...result, assetId } });
  } catch (err) {
    if (err instanceof CloudinaryNotConfiguredError) {
      return NextResponse.json({ success: false, error: "Direct upload is not available. Paste a link or use Google Drive.", code: "CLOUDINARY_NOT_CONFIGURED" }, { status: 503 });
    }
    const msg = err instanceof Error ? err.message : "Internal server error";
    let enhanced = msg;
    if (msg.includes("timed out")) enhanced = `${msg} Try the direct upload or Drive for large files.`;
    else if (msg.includes("too large") || msg.includes("413")) enhanced = `${msg} Compress or use Drive.`;
    return NextResponse.json({ success: false, error: enhanced }, { status: 500 });
  }
}
