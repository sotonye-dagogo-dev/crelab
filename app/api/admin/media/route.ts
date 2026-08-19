import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { MediaAssetService } from "@/services/MediaAssetService";
import { AuditService } from "@/services/AuditService";

export async function GET() {
  try {
    await requireRole("ADMIN");
    const assets = await MediaAssetService.listAll();
    return NextResponse.json({ success: true, data: assets });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole("ADMIN");
    const body = (await req.json().catch(() => ({}))) as {
      dryRun?: boolean;
      olderThanHours?: number;
    };
    const result = await MediaAssetService.cleanupOrphans({
      dryRun: body.dryRun ?? false,
      olderThanHours: body.olderThanHours,
    });
    await AuditService.log({
      userId: session.user.id,
      action: "media.cleanup",
      entity: "media",
      newValue: result,
    });
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return handleError(err);
  }
}

function handleError(err: unknown) {
  if (err instanceof Error && (err.message === "Forbidden" || err.message === "Unauthorized")) {
    const status = err.message === "Forbidden" ? 403 : 401;
    return NextResponse.json({ success: false, error: err.message }, { status });
  }
  return NextResponse.json(
    { success: false, error: err instanceof Error ? err.message : "Internal server error" },
    { status: 500 },
  );
}
