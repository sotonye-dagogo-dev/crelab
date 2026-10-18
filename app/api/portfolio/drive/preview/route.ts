import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { DriveService } from "@/services/DriveService";
import {
  DRIVE_LIMITS,
  DriveAccessError,
  DriveRateLimitError,
  DriveValidationError,
} from "@/lib/drive";
import { consumeRateWindow } from "@/lib/rate-limit";

const PREVIEW_WINDOW_MS = 60_000;
const DEFAULT_CLIENT_COOLDOWN_SECONDS = 15;

/**
 * POST /api/portfolio/drive/preview — READ-ONLY link check.
 *
 * Confirms a pasted Drive folder link resolves against Google's API and
 * returns a bounded sample (name + thumbnails + supported counts) so users
 * know a sync will succeed before committing. Deliberately writes nothing:
 * no portfolio_items rows, no providers.drive_folder_url — this is the
 * "test the API without touching the DB" affordance.
 *
 * Budget layers (directive):
 * 1. shared per-isolate Drive throttle + retries (lib/drive.ts)
 * 2. per-user sliding window here (DRIVE_PREVIEW_MAX_PER_MINUTE -> 429 +
 *    Retry-After, mirrored by a client cooldown)
 * 3. bounded sample (DRIVE_PREVIEW_MAX_FILES, hard-capped at PREVIEW_SAMPLE_MAX)
 *
 * Unlike the sync route there is NO provider-row requirement: onboarding
 * (collect mode) runs before any provider row exists (see repair-system.md —
 * never gate an endpoint behind a resource the user doesn't have yet).
 */
export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (session.user.role !== "PROVIDER" && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Forbidden: providers only" },
        { status: 403 },
      );
    }

    const budget = consumeRateWindow(`drive-preview:${session.user.id}`, {
      limit: DRIVE_LIMITS.previewMaxPerMinute,
      windowMs: PREVIEW_WINDOW_MS,
    });
    if (!budget.allowed) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil(budget.retryAfterMs / 1000),
      );
      return NextResponse.json(
        {
          success: false,
          error: `You've checked a few links in a row — please wait ${retryAfterSeconds} seconds and try again.`,
          retryAfterSeconds,
        },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const folderUrl = (body as { folderUrl?: unknown } | null)?.folderUrl;
    if (!folderUrl || typeof folderUrl !== "string") {
      return NextResponse.json(
        { success: false, error: "folderUrl is required" },
        { status: 400 },
      );
    }

    const driveService = new DriveService();
    const result = await driveService.previewFolder(folderUrl);

    return NextResponse.json(
      { success: true, data: result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    // Rate-limit check must precede DriveAccessError (it's a subclass) so a
    // throttled request gets a retryable 503 rather than the "private folder" 502.
    if (err instanceof DriveRateLimitError) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((err.retryAfterMs ?? DEFAULT_CLIENT_COOLDOWN_SECONDS * 1000) / 1000),
      );
      return NextResponse.json(
        {
          success: false,
          error:
            "Google Drive is rate-limiting requests right now. Please wait a minute and try again.",
          retryAfterSeconds,
        },
        { status: 503, headers: { "Retry-After": String(retryAfterSeconds) } },
      );
    }
    if (err instanceof DriveValidationError) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: 400 },
      );
    }
    if (err instanceof DriveAccessError) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
