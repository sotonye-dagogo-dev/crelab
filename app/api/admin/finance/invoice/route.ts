import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { FinanceService } from "@/services/FinanceService";

/**
 * ADMIN-only invoice projection over an existing payment/booking.
 * Query: paymentId (preferred) or bookingId (latest payment wins).
 * Read-only: no rows are created, amounts come straight from the ledger.
 */
export async function GET(req: NextRequest) {
  try {
    await requireRole("ADMIN");
    const { searchParams } = new URL(req.url);
    const paymentId = searchParams.get("paymentId") ?? undefined;
    const bookingId = searchParams.get("bookingId") ?? undefined;
    if (!paymentId && !bookingId) {
      return NextResponse.json(
        { success: false, error: "Provide paymentId or bookingId" },
        { status: 400 },
      );
    }
    const invoice = await new FinanceService().getInvoiceData(paymentId, bookingId);
    if (!invoice) {
      return NextResponse.json(
        { success: false, error: "No payment found for this reference" },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, data: invoice });
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
