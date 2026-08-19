import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Fires the welcome email once email verification succeeds. Guarded so it only
 * runs for a signed-in user whose email is actually verified — prevents spam
 * against the endpoint and ensures Google users (verified at signup) get their
 * welcome immediately via the register flow instead of here.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Not signed in" }, { status: 401 });
    }

    if (!session.user.emailVerified) {
      return NextResponse.json({ success: false, error: "Email not verified" }, { status: 400 });
    }

    const { EmailService } = await import("@/services/EmailService");
    const { PlatformConfigService } = await import("@/services/PlatformConfigService");
    const config = await PlatformConfigService.get();

    if (!config.features?.emailNotifications) {
      return NextResponse.json({ success: true, sent: false, reason: "notifications_disabled" });
    }

    const result = await EmailService.sendWelcome(session.user.email, session.user.name, config);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("[POST /api/verify-email/welcome] Error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
