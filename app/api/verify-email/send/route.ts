import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isResendConfigured } from "@/services/EmailService";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { DEFAULT_CONFIG } from "@/config/platform.config";

/**
 * Public endpoint that triggers Better Auth's (non-blocking) email-verification
 * email for an account. The callback URL routes the user back to
 * /verify-email?done=1 where the success state and welcome email are handled.
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
    const templateEnabled = config.emailConfig?.templates?.verifyEmail?.enabled ?? false;

    await auth.api.sendVerificationEmail({
      body: { email, callbackURL: "/verify-email?done=1" },
      headers: req.headers,
    });

    if (!emailNotifications) {
      return NextResponse.json({
        success: true,
        sent: false,
        reason: "Email notifications disabled",
      });
    }
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
