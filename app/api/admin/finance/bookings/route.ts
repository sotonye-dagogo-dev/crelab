import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { FinanceService } from "@/services/FinanceService";

/**
 * ADMIN-only financial view of bookings: joins client/provider/package with
 * payment state so the finance page can observe bookings and the payments
 * involving them. Read-only — settlement actions live on the per-booking
 * routes so they share the same non-admin EscrowService money paths.
 *
 * Query keys: q, status, escrowState, paymentMode, from, to, page, pageSize.
 */
export async function GET(req: NextRequest) {
  try {
    await requireRole("ADMIN");
    const { searchParams } = new URL(req.url);
    const raw = Object.fromEntries(searchParams.entries());
    const result = await new FinanceService().listBookings(raw);
    return NextResponse.json({ success: true, ...result });
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
