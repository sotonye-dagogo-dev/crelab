import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { WebinarService } from "@/services/WebinarService";
import { AuditService } from "@/services/AuditService";

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

/**
 * Admin seat removal — soft-cancels one registration (`?registrationId=`).
 * Soft (status flip, not row delete) so the audit trail survives under
 * `?all=1` while the REGISTERED count drops immediately.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole("ADMIN");
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const registrationId = (searchParams.get("registrationId") || "").trim();
    if (!registrationId) {
      return NextResponse.json(
        { success: false, error: "registrationId is required" },
        { status: 400 },
      );
    }
    const cancelled = await WebinarService.adminCancelRegistration(id, registrationId);
    if (!cancelled) {
      return NextResponse.json(
        { success: false, error: "Registration not found" },
        { status: 404 },
      );
    }
    await AuditService.log({
      userId: session.user.id,
      action: "webinar.registration.cancel",
      entity: "webinar_registrations",
      entityId: registrationId,
      newValue: { webinarId: id, status: "CANCELLED" },
    });
    return NextResponse.json({ success: true, data: { cancelled: true } });
  } catch (err) {
    if (err instanceof Error && (err.message === "Forbidden" || err.message === "Unauthorized")) {
      const status = err.message === "Forbidden" ? 403 : 401;
      return NextResponse.json({ success: false, error: err.message }, { status });
    }
    console.error("[DELETE /api/admin/webinars/[id]/registrations] error", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
