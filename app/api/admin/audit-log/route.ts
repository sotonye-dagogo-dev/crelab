import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { AuditService } from "@/services/AuditService";

const MAX_PAGE_SIZE = 100;

/**
 * ADMIN-only audit-trail listing with optional filters and server-side
 * pagination. Returns the joined actor (name/email) for every entry so UIs can
 * show who performed each action.
 */
export async function GET(req: NextRequest) {
  try {
    await requireRole("ADMIN");

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") ?? undefined;
    const entity = searchParams.get("entity") ?? undefined;
    const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number.parseInt(searchParams.get("pageSize") ?? "25", 10) || 25),
    );

    const [data, total] = await Promise.all([
      AuditService.list({
        action,
        entity,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
      AuditService.count({ action, entity }),
    ]);

    return NextResponse.json({
      success: true,
      data,
      total,
      page,
      pageSize,
    });
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