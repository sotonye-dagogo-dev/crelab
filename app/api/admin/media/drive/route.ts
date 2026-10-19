import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { PortfolioService } from "@/services/PortfolioService";

/**
 * ADMIN-only observation of Google Drive-integrated portfolio items
 * (portfolio_items.source = DRIVE). Read-only: these files live in the
 * providers' Google Drive folders, so no delete/reconcile/cleanup applies —
 * the admin media page renders them view-only.
 */
export async function GET() {
  try {
    await requireRole("ADMIN");
    const data = await PortfolioService.listDriveItems();
    return NextResponse.json({ success: true, data });
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
