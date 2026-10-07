import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { REFERRAL_COOKIE, ReferralService } from "@/services/ReferralService";

/**
 * Claim the referral captured in the `crelab_ref` cookie for the signed-in
 * user. Idempotent — replaying inserts nothing (unique on
 * user/invitee/degree/source) — and always clears the cookie afterwards so a
 * later account on the same browser can't reuse it.
 */
export async function POST(req: NextRequest) {
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

    const rawCode = req.cookies.get(REFERRAL_COOKIE)?.value ?? null;
    const result = await ReferralService.claimFromCode(rawCode, session.user.id);

    const res = NextResponse.json({ success: true, data: result });
    res.cookies.set(REFERRAL_COOKIE, "", {
      path: "/",
      maxAge: 0,
      sameSite: "lax",
    });
    return res;
  } catch (err) {
    console.error("[POST /api/referrals/claim] error", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
