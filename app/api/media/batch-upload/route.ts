import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { DEFAULT_CONFIG } from "@/config/platform.config";
import { uploadFile, CloudinaryNotConfiguredError, deleteAssetsByUrl } from "@/lib/cloudinary";
import { MediaAssetService } from "@/services/MediaAssetService";
import { isMediaFileAllowed } from "@/lib/media";

export const runtime = "nodejs";
export const maxDuration = 300;

interface BatchUploadResult {
  assetId: string;
  url: string;
  thumbnailUrl: string | null;
  mimeType: string;
  resourceType: "video" | "image";
  publicId: string;
  fileName: string;
}

function formatBytes(bytes: number): string {
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
      // Common when payload exceeds Vercel/Next body limit (~4.5 MB on Hobby).
      // Tell client to use direct-to-Cloudinary or Drive.
      const hint = msg.includes("413") || msg.includes("too large") || msg.includes("Body exceeded")
        ? " The file may be too large for the server proxy (≈4.5 MB limit on this host). Try again — large files now upload directly to Cloudinary from your browser — or use Google Drive for files over 50 MB."
        : "";
      return NextResponse.json({ success: false, error: `Could not read upload: ${msg}.${hint}`, code: "FORM_PARSE_FAILED" }, { status: 413 });
    }

    // Robust file collection: accept "files", "file", and any File values
    let files = (formData.getAll("files") as unknown[]).filter((v): v is File => v instanceof File && v.size >= 0);
    if (!files.length) {
      const single = formData.get("file");
      if (single instanceof File) files = [single];
      else {
        const all: File[] = [];
        for (const v of formData.values()) if (v instanceof File && v.size >= 0) all.push(v);
        // filter out empty placeholder files (some browsers send 0-byte entries)
        const nonEmpty = all.filter((f) => f.size > 0);
        files = nonEmpty.length ? nonEmpty : all;
      }
    }

    // Remove 0-byte entries but keep error feedback
    const emptyFiles = files.filter((f) => f.size === 0);
    if (emptyFiles.length) {
      return NextResponse.json(
        {
          success: false,
          error: "One or more files are empty (0 bytes). Please re-select the files and try again. If the file was truncated, try the direct upload or Google Drive.",
          code: "EMPTY_FILE",
          details: emptyFiles.map((f) => `${f.name || "unnamed"} is empty (0 bytes)`),
        },
        { status: 400 },
      );
    }

    if (!files.length) {
      return NextResponse.json(
        {
          success: false,
          error: "At least one file is required",
          code: "NO_FILE",
          details: ["No file was received. Make sure the form field is named 'file' or 'files' and try again."],
        },
        { status: 400 },
      );
    }

    if (files.length > 5) {
      return NextResponse.json({ success: false, error: "Maximum 5 files per batch. You sent " + files.length + ".", code: "TOO_MANY_FILES" }, { status: 400 });
    }

    // Per-file validation (do NOT cap total batch size — each file is judged individually against maxFileSizeMb)
    const maxBytes = mediaUpload.maxFileSizeMb * 1024 * 1024;
    const failedValidations: { fileName: string; reason: string }[] = [];
    const validFiles: File[] = [];

    for (const file of files) {
      const validation = isMediaFileAllowed(file, mediaUpload);
      if (!validation.ok) {
        let suggestion = "";
        if (file.size > maxBytes) {
          suggestion = ` File is ${formatBytes(file.size)} but the limit is ${mediaUpload.maxFileSizeMb} MB per file. Compress the file (e.g. Handbrake for video) or use Google Drive, which handles large files better.`;
        } else if (!mediaUpload.videoTypes.includes(file.type) && !mediaUpload.imageTypes.includes(file.type)) {
          suggestion = ` Supported: ${[...mediaUpload.videoTypes, ...mediaUpload.imageTypes].join(", ")}.`;
        }
        failedValidations.push({ fileName: file.name, reason: `${validation.reason}.${suggestion}` });
      } else {
        validFiles.push(file);
      }
    }

    // If every file failed validation, return 400 early — no uploads attempted (ACID: no side effects)
    if (validFiles.length === 0 && failedValidations.length) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed for all files",
          code: "VALIDATION_FAILED",
          details: failedValidations.map((v) => `${v.fileName}: ${v.reason}`),
          failures: failedValidations,
        },
        { status: 400 },
      );
    }

    // Per-file ACID uploads: each file is its own transaction (upload + DB record).
    // Failures do NOT roll back earlier successes — the batch is not atomic, each file is isolated.
    const successes: BatchUploadResult[] = [];
    const failures: { fileName: string; error: string; code?: string }[] = [];

    for (const file of validFiles) {
      try {
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
          await deleteAssetsByUrl([result.url]).catch(() => {});
          throw new Error(`Uploaded to Cloudinary but failed to register ${file.name}. The upload was cleaned up — please try again.`);
        }
        successes.push({
          assetId: assetId!,
          url: result.url,
          thumbnailUrl: result.thumbnailUrl,
          mimeType: result.mimeType,
          resourceType: result.resourceType,
          publicId: result.publicId,
          fileName: file.name,
        });
      } catch (err) {
        const raw = err instanceof Error ? err.message : String(err);
        let enhanced = raw;
        if (raw.includes("timed out")) enhanced = `${raw} The upload timed out — your connection may be slow or the file is large. Try again or use Google Drive for files over ${mediaUpload.maxFileSizeMb}MB.`;
        else if (raw.includes("too large") || raw.includes("413")) enhanced = `${raw} File is ${formatBytes(file.size)} (limit ${mediaUpload.maxFileSizeMb}MB). Compress or use Drive.`;
        failures.push({ fileName: file.name, error: enhanced });
      }
    }

    // Also surface validation failures alongside upload failures
    for (const v of failedValidations) failures.push({ fileName: v.fileName, error: v.reason, code: "VALIDATION_FAILED" });

    if (successes.length === 0 && failures.length > 0) {
      return NextResponse.json({ success: false, error: "All uploads failed", code: "ALL_FAILED", details: failures.map((f) => `${f.fileName}: ${f.error}`), failures, data: [] }, { status: 500 });
    }

    if (failures.length > 0) {
      // Partial success — 207 Multi-Status semantics but we return 200 with success:true for compat and details
      return NextResponse.json({
        success: true,
        partial: true,
        data: successes,
        failures,
        error: `${successes.length} file(s) uploaded, ${failures.length} failed`,
        details: failures.map((f) => `${f.fileName}: ${f.error}`),
      });
    }

    return NextResponse.json({ success: true, data: successes });
  } catch (err) {
    if (err instanceof CloudinaryNotConfiguredError) {
      return NextResponse.json({ success: false, error: "Direct upload is not available. Paste a link or use Google Drive.", code: "CLOUDINARY_NOT_CONFIGURED" }, { status: 503 });
    }
    const msg = err instanceof Error ? err.message : "Internal server error";
    let enhanced = msg;
    if (msg.includes("timed out")) enhanced = `${msg} Try again or use Drive for large files.`;
    return NextResponse.json({ success: false, error: enhanced }, { status: 500 });
  }
}
