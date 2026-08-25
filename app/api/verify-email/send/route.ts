import { NextRequest, NextResponse } from "next/server";
import { emailNotSentLabel, isResendConfigured } from "@/services/EmailService";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { resolveEmailTemplate } from "@/lib/email-templates";
import { DEFAULT_CONFIG } from "@/config/platform.config";
import { eq } from "drizzle-orm";

/**
 * Public endpoint that triggers Better Auth's (non-blocking) email-verification
 * email for an account. The callback URL routes the user back to
 * /verify-email?done=1 where the success state and welcome email are handled.
 *
 * The response reflects the REAL send outcome (captured via the request-scoped
 * email sink) rather than a false "sent" — Better Auth's callback swallows
 * failures, so without the sink the API could return success even when Resend
 * rejected the mail.
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

    // Generate verification token and URL ourselves so we can send the email
    // directly via EmailService and get a reliable send result, instead of
    // relying on Better Auth's callback which may execute outside the
    // AsyncLocalStorage sink context.
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour
    const { db } = await import("@/lib/db");
    const { verification } = await import("@/drizzle/schema");

    await db.insert(verification).values({
      id: crypto.randomUUID(),
      identifier: email.toLowerCase(),
      value: token,
      expiresAt,
    });

    const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";
    const verifyUrl = `${baseUrl}/verify-email?done=1&token=${token}`;

    const { EmailService } = await import("@/services/EmailService");
    const result = await EmailService.sendVerifyEmail(email, "User", verifyUrl, config);

    if (!result.sent) {
      // Clean up the token since the email failed
      await db.delete(verification).where(eq(verification.value, token));
      return NextResponse.json({
        success: true,
        sent: false,
        reason: emailNotSentLabel(result.reason),
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