import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { disputes } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { EscrowService } from "@/services/EscrowService";
import { AuditService } from "@/services/AuditService";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireRole("ADMIN");
    const { id: disputeId } = await params;
    const body = await req.json();
    const { outcome, adminNotes } = body;

    if (!outcome || !["RELEASED", "REFUNDED"].includes(outcome)) {
      return NextResponse.json(
        { success: false, error: "Outcome must be RELEASED or REFUNDED" },
        { status: 400 },
      );
    }

    const existing = await db
      .select()
      .from(disputes)
      .where(eq(disputes.id, disputeId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { success: false, error: "Dispute not found" },
        { status: 404 },
      );
    }

    if (existing[0].outcome !== null || existing[0].resolvedAt !== null) {
      return NextResponse.json(
        { success: false, error: "Dispute already resolved" },
        { status: 409 },
      );
    }

    const escrowService = new EscrowService();
    const result = await escrowService.resolveDispute(
      disputeId,
      session.user.id,
      outcome as "RELEASED" | "REFUNDED",
      adminNotes ?? "",
    );

    await AuditService.log({
      userId: session.user.id,
      action: "dispute.resolve",
      entity: "disputes",
      entityId: disputeId,
      oldValue: { outcome: existing[0].outcome },
      newValue: { outcome, adminNotes: adminNotes ?? "" },
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
