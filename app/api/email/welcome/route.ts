import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json();

    if (!email || !name) {
      return NextResponse.json(
        { success: false, error: "Email and name are required" },
        { status: 400 },
      );
    }

    const { EmailService } = await import("@/services/EmailService");
    const { PlatformConfigService } = await import("@/services/PlatformConfigService");

    const config = await PlatformConfigService.getCached();

    if (!config.features?.emailNotifications) {
      return NextResponse.json({ success: true, sent: false, reason: "notifications_disabled" });
    }

    const result = await EmailService.sendWelcome(email, name, config);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("[POST /api/email/welcome] Error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}