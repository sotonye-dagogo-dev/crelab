import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bugReports } from "@/drizzle/schema";
import { requireRole } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";
import { AuditService } from "@/services/AuditService";

export async function GET() {
  try {
    await requireRole("ADMIN");
    const rows = await db
      .select()
      .from(bugReports)
      .orderBy(desc(bugReports.createdAt));
    return NextResponse.json({ success: true, data: rows });
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

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireRole("ADMIN");
    const body = (await req.json()) as { id: string; status?: string; adminNotes?: string };

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: "id is required" },
        { status: 400 },
      );
    }

    const existing = await db
      .select({ id: bugReports.id, status: bugReports.status })
      .from(bugReports)
      .where(eq(bugReports.id, body.id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { success: false, error: "Bug report not found" },
        { status: 404 },
      );
    }

    const updateData: Record<string, unknown> = {};
    if (body.status) {
      const validStatuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { success: false, error: "Invalid status" },
          { status: 400 },
        );
      }
      updateData.status = body.status;
      if (body.status === "RESOLVED") {
        updateData.resolvedAt = new Date();
      }
    }
    if (body.adminNotes !== undefined) {
      updateData.adminNotes = body.adminNotes;
    }
    updateData.updatedAt = new Date();

    await db.update(bugReports).set(updateData).where(eq(bugReports.id, body.id));

    await AuditService.log({
      userId: session.user.id,
      action: "bugReport.update",
      entity: "bugReports",
      entityId: body.id,
      oldValue: { status: existing[0].status },
      newValue: updateData,
    });

    return NextResponse.json({ success: true, data: null });
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
