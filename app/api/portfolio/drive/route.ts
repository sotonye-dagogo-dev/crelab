import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { providers } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { DriveService } from "@/services/DriveService";
import { DriveAccessError, DriveRateLimitError, DriveValidationError } from "@/lib/drive";

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

    const provider = await db
      .select()
      .from(providers)
      .where(eq(providers.userId, session.user.id))
      .then((rows) => rows[0]);

    if (!provider) {
      return NextResponse.json(
        { success: false, error: "Provider profile not found" },
        { status: 404 },
      );
    }

    const body = await req.json();
    const { folderUrl } = body;

    if (!folderUrl || typeof folderUrl !== "string") {
      return NextResponse.json(
        { success: false, error: "folderUrl is required" },
        { status: 400 },
      );
    }

    const driveService = new DriveService();
    const result = await driveService.ingestFolder(
      provider.id,
      folderUrl,
    );

    await db
      .update(providers)
      .set({ driveFolderUrl: folderUrl })
      .where(eq(providers.id, provider.id));

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    // Rate-limit check must precede DriveAccessError (it's a subclass) so a
    // throttled request gets a retryable 503 rather than the "private folder" 502.
    if (err instanceof DriveRateLimitError) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Google Drive is rate-limiting requests right now. Please wait a minute and try again — your folder connection is fine.",
        },
        { status: 503 },
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
