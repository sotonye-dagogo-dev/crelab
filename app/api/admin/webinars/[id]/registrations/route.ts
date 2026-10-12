import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { WebinarService } from "@/services/WebinarService";

/**
 * Admin attendee list for one webinar — lets admins verify registrations
 * actually persisted (name/email/consent/status per seat). REGISTERED only by
 * default so it agrees with the count column; `?all=1` includes CANCELLED.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole("ADMIN");
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const includeCancelled = searchParams.get("all") === "1";
    const existing = await WebinarService.adminGet(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: "Webinar not found" }, { status: 404 });
    }
    const registrations = await WebinarService.listRegistrations(id, { includeCancelled });
    return NextResponse.json({ success: true, data: registrations });
  } catch (err) {
    if (err instanceof Error && (err.message === "Forbidden" || err.message === "Unauthorized")) {
      const status = err.message === "Forbidden" ? 403 : 401;
      return NextResponse.json({ success: false, error: err.message }, { status });
    }
    console.error("[GET /api/admin/webinars/[id]/registrations] error", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
