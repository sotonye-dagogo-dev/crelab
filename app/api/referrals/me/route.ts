import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ReferralService } from "@/services/ReferralService";

/** Authenticated referral summary: share link, points and degree breakdown. */
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

    const summary = await ReferralService.getSummary(session.user.id);
    return NextResponse.json({ success: true, data: summary });
  } catch (err) {
    console.error("[GET /api/referrals/me] error", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
