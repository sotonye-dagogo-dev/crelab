import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { AnalyticsService } from "@/services/AnalyticsService";
import { normalizeRange } from "@/lib/analytics";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { DEFAULT_CONFIG } from "@/config/platform.config";

/**
 * ADMIN-only platform analytics overview.
 * Query: range=7|30|90|365 (days; defaults to the analytics config).
 * All aggregates are bounded group-bys — no full-table scans into memory.
 */
export async function GET(req: NextRequest) {
  try {
    await requireRole("ADMIN");
    const { searchParams } = new URL(req.url);
    const config = await PlatformConfigService.get().catch(() => DEFAULT_CONFIG);
    const fallback = config.analytics?.defaultRangeDays ?? 30;
    const range = normalizeRange(searchParams.get("range") ?? undefined, fallback);
    const overview = await new AnalyticsService().getOverview(range);
    return NextResponse.json({ success: true, data: overview });
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
