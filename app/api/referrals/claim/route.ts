import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { REFERRAL_COOKIE, resolveClaimCode } from "@/lib/referral-cookie";
import { ReferralService } from "@/services/ReferralService";

/**
 * Claim the referral captured in the `crellab_ref` cookie for the signed-in
 * user. Idempotent — replaying inserts nothing (unique on
 * user/invitee/degree/source) — and always clears the cookie afterwards so a
 * later account on the same browser can't reuse it.
 *
 * The cookie is the primary carrier (set by `ReferralCapture` from `?ref=` on
 * any entry point). A JSON `{ code }` body is accepted as a fallback so
 * programmatic callers that hold the code but not the cookie (e.g. blocked
 * third-party-cookie contexts) can still attribute — the cookie value wins
 * when both are present.
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

    const cookieCode = req.cookies.get(REFERRAL_COOKIE)?.value ?? null;
    let bodyCode: string | null = null;
    try {
      const body = await req.json();
      if (body && typeof body.code === "string") bodyCode = body.code;
    } catch {
      // No JSON body — cookie-only claim.
    }
    const result = await ReferralService.claimFromCode(
      resolveClaimCode(cookieCode, bodyCode),
      session.user.id,
    );

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
