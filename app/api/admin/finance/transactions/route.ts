import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { FinanceService } from "@/services/FinanceService";

/**
 * ADMIN-only unified transaction feed (payments + wallet ledger).
 * Query: q, kind (ALL|PAYMENT|WALLET), status, type, from, to, page, pageSize.
 */
export async function GET(req: NextRequest) {
  try {
    await requireRole("ADMIN");
    const { searchParams } = new URL(req.url);
    const raw: Record<string, string | string[] | undefined> = {};
    searchParams.forEach((value, key) => {
      raw[key] = value;
    });
    const result = await new FinanceService().listTransactions(raw);
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
