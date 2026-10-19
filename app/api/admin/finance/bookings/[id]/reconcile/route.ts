import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { EscrowService, RECONCILE_REVIEW_OUTCOMES } from "@/services/EscrowService";

/**
 * ADMIN "Reconcile escrow" action for one booking. Processor-verifies the
 * booking's stored charge and, when the charge is real, finishes the
 * ACCEPTED→HELD hold. Same `EscrowService.reconcileBooking` money path as the
 * client self-heal and cron sweep — the only difference is the actor (audited
 * as the admin who clicked) and that the full outcome is surfaced in the UI.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireRole("ADMIN");
    const { id } = await params;

    const result = await new EscrowService().reconcileBooking(id, {
      actorId: session.user.id,
      verifyWithProcessor: true,
      audit: true,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        needsReview: RECONCILE_REVIEW_OUTCOMES.includes(result.outcome),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    if (msg === "Forbidden" || msg === "Unauthorized") {
      return NextResponse.json({ success: false, error: msg }, { status: msg === "Forbidden" ? 403 : 401 });
    }
    if (msg === "Booking not found") {
      return NextResponse.json({ success: false, error: msg }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
