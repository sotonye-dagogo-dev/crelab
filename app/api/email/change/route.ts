import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isResendConfigured, EmailService } from "@/services/EmailService";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { db } from "@/lib/db";
import { verification } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { DEFAULT_CONFIG } from "@/config/platform.config";

/**
 * Authenticated endpoint that requests an email change. Sends the verification
 * link ONLY to the NEW address the user entered — the confirmation must never
 * go to the current/old address.
 *
 * We implement this directly instead of using Better Auth's changeEmail to
 * avoid Better Auth sending a notification to the old address.
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

    const normalizedNewEmail = newEmail.trim().toLowerCase();

    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Not signed in" }, { status: 401 });
    }

    const oldEmail = session.user.email;
    if (oldEmail.toLowerCase() === normalizedNewEmail) {
      return NextResponse.json(
        { success: false, error: "New email must be different from current email" },
        { status: 400 },
      );
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

    // Generate verification token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour

    // Store token with both old and new email for verification
    await db.insert(verification).values({
      id: crypto.randomUUID(),
      identifier: oldEmail,
      value: JSON.stringify({ token, newEmail: normalizedNewEmail }),
      expiresAt,
    });

    const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";
    const verifyUrl = `${baseUrl}/verify-email?done=1&token=${token}&emailChange=1`;

    // Send verification email ONLY to the new address
    const result = await EmailService.sendVerifyEmail(normalizedNewEmail, session.user.name, verifyUrl, config ?? DEFAULT_CONFIG);

    if (!result.sent) {
      // Clean up the token since the email failed
      await db.delete(verification).where(eq(verification.value, JSON.stringify({ token, newEmail: normalizedNewEmail })));
      return NextResponse.json({
        success: true,
        sent: false,
        reason: result.reason ? `Email not sent: ${result.reason}` : "Failed to send verification email",
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