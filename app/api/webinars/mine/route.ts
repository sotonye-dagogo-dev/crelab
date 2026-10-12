import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { WebinarService } from "@/services/WebinarService";

/**
 * My webinar registrations — the persistence source of truth for the public
 * page. Authenticated visitors resolve via the session (userId + email, so
 * guest seats made with the same email still match); guests pass `?email=` and
 * get their seats by email key. Always 200 with an (possibly empty) id list —
 * never an auth error — so the public page degrades to "not registered".
 */
export async function GET(req: NextRequest) {
  try {
    let userId: string | null = null;
    let sessionEmail: string | null = null;
    try {
      let s = await auth.api.getSession({ headers: req.headers });
      if (!s?.user) {
        try {
          const h = await headers();
          s = await auth.api.getSession({ headers: h });
        } catch {
          // Guest flow below.
        }
      }
      if (s?.user) {
        userId = s.user.id;
        sessionEmail = s.user.email ?? null;
      }
    } catch {
      // Guest flow below.
    }

    const { searchParams } = new URL(req.url);
    const queryEmail = (searchParams.get("email") || "").trim() || null;
    const email = sessionEmail || queryEmail;

    if (!userId && !email) {
      return NextResponse.json({ success: true, data: { webinarIds: [], subscribed: false } });
    }

    const [webinarIds, subscribed] = await Promise.all([
      WebinarService.myWebinarIds({ userId, email }),
      userId ? WebinarService.hasMarketingConsent(userId) : Promise.resolve(false),
    ]);

    return NextResponse.json({ success: true, data: { webinarIds, subscribed } });
  } catch (err) {
    console.error("[GET /api/webinars/mine] error", err);
    return NextResponse.json({ success: true, data: { webinarIds: [], subscribed: false } });
  }
}
