import { NextRequest, NextResponse } from "next/server";
import { emailNotSentLabel, isResendConfigured } from "@/services/EmailService";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { resolveEmailTemplate } from "@/lib/email-templates";
import { DEFAULT_CONFIG } from "@/config/platform.config";
import { sendVerificationEmailTo } from "@/lib/verify-email";

/**
 * Public endpoint that triggers the (non-blocking) email-verification email
 * for an account. The link routes the user back to `/verify-email?token=…`,
 * which verifies on load and then lands on `?done=1` where the success state
 * and welcome email are handled.
 *
 * The response reflects the REAL send outcome rather than a false "sent".
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
    if (!emailNotifications) {
      return NextResponse.json({
        success: true,
        sent: false,
        reason: "Email notifications disabled",
      });
    }

    // Resolve the template against hardcoded defaults too — a wired template
    // (verifyEmail) remains usable even when it was never saved to the DB config.
    const templateEnabled = resolveEmailTemplate(config, "verifyEmail")?.enabled ?? false;
    if (!templateEnabled) {
      return NextResponse.json({
        success: true,
        sent: false,
        reason: "Verification template disabled",
      });
    }

    if (!isResendConfigured()) {
      return NextResponse.json({
        success: true,
        sent: false,
        reason: "Email sending is not configured",
      });
    }

    const outcome = await sendVerificationEmailTo(email, config);

    if (!outcome.sent) {
      return NextResponse.json({
        success: true,
        sent: false,
        reason: emailNotSentLabel(outcome.result.reason),
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
