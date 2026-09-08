import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bugReports, user } from "@/drizzle/schema";
import { requireRole } from "@/lib/auth";
import { eq, desc, inArray } from "drizzle-orm";
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

async function sendStatusEmail(opts: {
  report: { title: string; status: string; adminNotes: string | null; reporterEmail: string | null; reporterName: string | null; userId: string | null };
  newStatus: string;
  adminNotes: string | null | undefined;
}): Promise<{ sent: boolean; to?: string; skippedReason?: string }> {
  const { report, newStatus, adminNotes } = opts;
  // Resolve recipient: prefer reporterEmail, else look up user email
  let to: string | null = report.reporterEmail ?? null;
  let name = report.reporterName ?? "there";
  if (!to && report.userId) {
    const rows = await db.select({ email: user.email, name: user.name }).from(user).where(eq(user.id, report.userId)).limit(1);
    if (rows.length) {
      to = rows[0].email;
      name = rows[0].name;
    }
  }
  if (!to) return { sent: false, skippedReason: "No recipient email on this report" };

  // Only send for meaningful transitions
  const isReview = newStatus === "IN_PROGRESS";
  const isCompleted = newStatus === "RESOLVED" || newStatus === "CLOSED";
  if (!isReview && !isCompleted) return { sent: false, skippedReason: "Status does not trigger an email" };

  const [{ EmailService }, { PlatformConfigService }] = await Promise.all([
    import("@/services/EmailService"),
    import("@/services/PlatformConfigService"),
  ]);
  const config = await PlatformConfigService.get();
  if (!config.features?.emailNotifications) {
    return { sent: false, skippedReason: "Email notifications are disabled" };
  }
  const note = (adminNotes ?? report.adminNotes ?? undefined) || undefined;
  let result;
  if (isReview) {
    result = await EmailService.sendBugReportUnderReview(to, { userName: name, reportTitle: report.title, adminNotes: note }, config);
  } else {
    const label = newStatus === "RESOLVED" ? "Resolved" : "Closed";
    result = await EmailService.sendBugReportResolved(to, { userName: name, reportTitle: report.title, statusLabel: label, adminNotes: note }, config);
  }
  return { sent: result.sent, to: result.to };
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireRole("ADMIN");
    const body = (await req.json()) as {
      id: string;
      status?: string;
      adminNotes?: string;
      sendEmail?: boolean;
    };

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: "id is required" },
        { status: 400 },
      );
    }

    const existing = await db
      .select()
      .from(bugReports)
      .where(eq(bugReports.id, body.id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { success: false, error: "Bug report not found" },
        { status: 404 },
      );
    }

    const prevStatus = existing[0].status;
    const updateData: Record<string, unknown> = {};
    const validStatuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
    let nextStatus: string | null = null;
    if (body.status) {
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { success: false, error: "Invalid status" },
          { status: 400 },
        );
      }
      nextStatus = body.status;
      updateData.status = body.status;
      if (body.status === "RESOLVED" || body.status === "CLOSED") {
        updateData.resolvedAt = new Date();
        updateData.resolvedById = session.user.id;
      }
      if (body.status === "OPEN") {
        updateData.resolvedAt = null;
        updateData.resolvedById = null;
      }
    }
    if (body.adminNotes !== undefined) {
      updateData.adminNotes = body.adminNotes;
    }
    if (!Object.keys(updateData).length) {
      return NextResponse.json({ success: false, error: "Nothing to update" }, { status: 400 });
    }
    updateData.updatedAt = new Date();

    await db.update(bugReports).set(updateData).where(eq(bugReports.id, body.id));

    let emailResult: { sent: boolean; to?: string; skippedReason?: string } | null = null;
    const shouldSendEmail = body.sendEmail !== false && nextStatus && nextStatus !== prevStatus;
    if (shouldSendEmail && nextStatus) {
      try {
        emailResult = await sendStatusEmail({
          report: existing[0] as unknown as { title: string; status: string; adminNotes: string | null; reporterEmail: string | null; reporterName: string | null; userId: string | null },
          newStatus: nextStatus,
          adminNotes: body.adminNotes,
        });
      } catch (e) {
        console.error("[PATCH /api/admin/bug-reports] email failed", e);
        emailResult = { sent: false, skippedReason: e instanceof Error ? e.message : String(e) };
      }
    }

    await AuditService.log({
      userId: session.user.id,
      action: "bugReport.update",
      entity: "bugReports",
      entityId: body.id,
      oldValue: { status: prevStatus, adminNotes: existing[0].adminNotes },
      newValue: { ...updateData, emailSent: emailResult?.sent ?? false, emailTo: emailResult?.to ?? null },
    });

    return NextResponse.json({ success: true, data: null, email: emailResult });
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

export async function POST(req: NextRequest) {
  // Bulk update endpoint: { ids: string[], status?: string, adminNotes?: string, sendEmail?: boolean }
  try {
    const session = await requireRole("ADMIN");
    const body = (await req.json()) as {
      ids: string[];
      status?: string;
      adminNotes?: string;
      sendEmail?: boolean;
    };
    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json({ success: false, error: "ids is required (non-empty array)" }, { status: 400 });
    }
    if (body.ids.length > 100) {
      return NextResponse.json({ success: false, error: "Maximum 100 reports per bulk operation" }, { status: 400 });
    }
    const validStatuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
    if (body.status && !validStatuses.includes(body.status)) {
      return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 });
    }
    if (!body.status && body.adminNotes === undefined) {
      return NextResponse.json({ success: false, error: "Provide status and/or adminNotes" }, { status: 400 });
    }

    const rows = await db.select().from(bugReports).where(inArray(bugReports.id, body.ids));
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: "No matching bug reports found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.status) {
      updateData.status = body.status;
      if (body.status === "RESOLVED" || body.status === "CLOSED") {
        updateData.resolvedAt = new Date();
        updateData.resolvedById = session.user.id;
      }
      if (body.status === "OPEN") {
        updateData.resolvedAt = null;
        updateData.resolvedById = null;
      }
    }
    if (body.adminNotes !== undefined) updateData.adminNotes = body.adminNotes;
    updateData.updatedAt = new Date();

    await db.update(bugReports).set(updateData).where(inArray(bugReports.id, rows.map((r) => r.id)));

    // Email handling — per-report, best-effort, never fails the bulk update itself
    let emailed = 0;
    let skipped = 0;
    const emailErrors: string[] = [];
    const shouldSendEmail = body.sendEmail !== false && Boolean(body.status);
    if (shouldSendEmail && body.status) {
      for (const row of rows) {
        const prevStatus = row.status as string;
        if (prevStatus === body.status) {
          skipped++;
          continue;
        }
        try {
          const res = await sendStatusEmail({
            report: row as unknown as { title: string; status: string; adminNotes: string | null; reporterEmail: string | null; reporterName: string | null; userId: string | null },
            newStatus: body.status!,
            adminNotes: body.adminNotes,
          });
          if (res.sent) emailed++;
          else skipped++;
          if (res.skippedReason) emailErrors.push(`${row.id}: ${res.skippedReason}`);
        } catch (e) {
          skipped++;
          emailErrors.push(`${row.id}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }

    await AuditService.log({
      userId: session.user.id,
      action: "bugReport.bulkUpdate",
      entity: "bugReports",
      entityId: rows.map((r) => r.id).join(","),
      oldValue: { ids: rows.map((r) => r.id), statuses: rows.map((r) => r.status) },
      newValue: { ...updateData, emailed, skipped },
    });

    return NextResponse.json({
      success: true,
      data: { updated: rows.length, emailed, skipped },
      emailErrors: emailErrors.length ? emailErrors : undefined,
    });
  } catch (err) {
    if (err instanceof Error && (err.message === "Forbidden" || err.message === "Unauthorized")) {
      const status = err.message === "Forbidden" ? 403 : 401;
      return NextResponse.json({ success: false, error: err.message }, { status });
    }
    console.error("[POST /api/admin/bug-reports] bulk error", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
