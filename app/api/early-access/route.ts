import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { EarlyMemberService } from "@/services/EarlyMemberService";

/**
 * Authenticated Founding-100 status. Returns `{ enabled: false }` without a
 * rank query when the `firstHundred` flag is off, so the badge client renders
 * nothing and the database is never touched.
 */
export async function GET(req: NextRequest) {
  try {
    let session: Awaited<ReturnType<typeof auth.api.getSession>> = null;
    try {
      session = await auth.api.getSession({ headers: req.headers });
    } catch {
      // No/invalid session — treated as anonymous below.
    }
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const status = await EarlyMemberService.getStatus(session.user.id);
    return NextResponse.json({ success: true, data: status });
  } catch (err) {
    console.error("[GET /api/early-access] error", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
