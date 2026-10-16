import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { FinanceService } from "@/services/FinanceService";

function authError(err: unknown) {
  if (err instanceof Error && (err.message === "Forbidden" || err.message === "Unauthorized")) {
    const status = err.message === "Forbidden" ? 403 : 401;
    return NextResponse.json({ success: false, error: err.message }, { status });
  }
  return NextResponse.json(
    { success: false, error: err instanceof Error ? err.message : "Internal server error" },
    { status: 500 },
  );
}

/** ADMIN-only lifetime money overview: GMV, fees, escrow held, wallet balances, booking mix. */
export async function GET() {
  try {
    await requireRole("ADMIN");
    const summary = await new FinanceService().getSummary();
    return NextResponse.json({ success: true, data: summary });
  } catch (err) {
    return authError(err);
  }
}
