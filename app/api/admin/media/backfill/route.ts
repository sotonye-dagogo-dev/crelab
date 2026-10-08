import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { MediaAssetService } from "@/services/MediaAssetService";
import { AuditService } from "@/services/AuditService";

/**
 * Explicit, admin-triggered rescue for pre-existing orphans: attaches every
 * unreferenced ACTIVE asset whose owner still owns a provider profile to that
 * portfolio as a visible DIRECT item (idempotent — no duplicates).
 *
 * Never runs automatically: orphans without a matching provider still need
 * the deliberate per-asset reconcile choice. `dryRun: true` previews counts
 * without writing anything.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireRole("ADMIN");
    const body = (await req.json().catch(() => ({}))) as {
      dryRun?: boolean;
      limit?: number;
    };
    const result = await MediaAssetService.backfillOrphans({
      dryRun: body.dryRun === true,
      limit: typeof body.limit === "number" ? body.limit : undefined,
    });
    await AuditService.log({
      userId: session.user.id,
      action: body.dryRun === true ? "media.backfill.dry_run" : "media.backfill",
      entity: "media",
      entityId: "bulk",
      newValue: { dryRun: body.dryRun === true, ...result },
    });
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    if (err instanceof Error && (err.message === "Forbidden" || err.message === "Unauthorized")) {
      const status = err.message === "Forbidden" ? 403 : 401;
      return NextResponse.json({ success: false, error: err.message }, { status });
    }
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
