import { NextRequest, NextResponse } from "next/server";
import { auth, getLastEmailSendResult, clearLastEmailSendResult } from "@/lib/auth";
import { isResendConfigured } from "@/services/EmailService";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { resolveEmailTemplate } from "@/lib/email-templates";
import { DEFAULT_CONFIG } from "@/config/platform.config";

/**
 * Public endpoint that triggers Better Auth's (non-blocking) email-verification
 * email for an account. The callback URL routes the user back to
 * /verify-email?done=1 where the success state and welcome email are handled.
 *
 * Better Auth always resolves the auth flow as success so it never breaks
 * sign-in; the actual email dispatch runs inside the `sendVerificationEmail`
 * callback. This route reads the recorded send result and reflects the real
 * outcome (e.g. a Resend rejection) instead of reporting a false `sent: true`.
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 },
      );
    }

    let config;
    try {
      config = await PlatformConfigService.getCached();
    } catch {
      config = DEFAULT_CONFIG;
    }

    const emailNotifications = config.features?.emailNotifications ?? false;
    // Resolve the template against hardcoded defaults too — a wired template
    // (verifyEmail) remains usable even when it was never saved to the DB config.
    const templateEnabled = resolveEmailTemplate(config, "verifyEmail")?.enabled ?? false;

    clearLastEmailSendResult("verifyEmail", email);

    await auth.api.sendVerificationEmail({
      body: { email, callbackURL: "/verify-email?done=1" },
      headers: req.headers,
    });

    // The send callback has now run (awaited by Better Auth). Surface its real
    // outcome so failures like a Resend rejection aren't reported as sent.
    const sendResult = getLastEmailSendResult("verifyEmail", email);
    if (sendResult && !sendResult.sent) {
      return NextResponse.json({
        success: true,
        sent: false,
        reason: sendResult.reason,
        error: sendResult.error,
      });
    }

    if (!emailNotifications) {
      return NextResponse.json({
        success: true,
        sent: false,
        reason: "notifications_disabled",
      });
    }
    if (!templateEnabled) {
      return NextResponse.json({
        success: true,
        sent: false,
        reason: "template_disabled",
      });
    }
    if (!isResendConfigured()) {
      return NextResponse.json({
        success: true,
        sent: false,
        reason: "resend_not_configured",
      });
    }

    return NextResponse.json({ success: true, sent: true });
  } catch (err) {
    if (err instanceof Error && err.name === "APIError") {
      // Treat account-not-found / already-verified identically to success so we
      // don't leak which emails have accounts.
      return NextResponse.json({ success: true, sent: true });
    }
    console.error("[POST /api/verify-email/send] Error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
