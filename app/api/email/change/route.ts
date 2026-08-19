import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { emailNotSentLabel, isResendConfigured } from "@/services/EmailService";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { runWithEmailSendSink } from "@/lib/email-send-sink";

/**
 * Authenticated endpoint that requests an email change. Mirrors Better Auth's
 * `changeEmail` (which sends a verification link to the NEW address the user
 * entered) but returns the REAL send outcome captured via the request-scoped
 * email sink — so the profile page never reports "confirmation sent" when the
 * mail actually failed to go out.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const newEmail: unknown = body?.newEmail;
    const callbackURL: string = typeof body?.callbackURL === "string" ? body.callbackURL : "/profile?emailChanged=1";

    if (typeof newEmail !== "string" || !newEmail.trim()) {
      return NextResponse.json(
        { success: false, error: "New email is required" },
        { status: 400 },
      );
    }

    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Not signed in" }, { status: 401 });
    }

    let config;
    try {
      config = await PlatformConfigService.getCached();
    } catch {
      config = null;
    }
    const emailNotifications = config?.features?.emailNotifications ?? true;
    if (!emailNotifications) {
      return NextResponse.json({
        success: true,
        sent: false,
        reason: "Email notifications are currently disabled.",
      });
    }
    if (!isResendConfigured()) {
      return NextResponse.json({
        success: true,
        sent: false,
        reason: "Email sending is not configured yet.",
      });
    }

    const { result } = await runWithEmailSendSink(() =>
      auth.api.changeEmail({
        body: { newEmail: newEmail.trim(), callbackURL },
        headers: req.headers,
      }),
    );

    if (result && !result.sent) {
      return NextResponse.json({
        success: true,
        sent: false,
        reason: emailNotSentLabel(result.reason),
      });
    }

    return NextResponse.json({ success: true, sent: true });
  } catch (err) {
    if (err instanceof Error) {
      const status = err.name === "APIError" ? 400 : 500;
      return NextResponse.json({ success: false, error: err.message }, { status });
    }
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}