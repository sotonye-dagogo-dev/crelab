import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, to } = body;

    if (!type || !to) {
      return NextResponse.json(
        { success: false, error: "type and to are required" },
        { status: 400 },
      );
    }

    const { EmailService } = await import("@/services/EmailService");
    const { PlatformConfigService } = await import("@/services/PlatformConfigService");

    const config = await PlatformConfigService.getCached();

    if (!config.features?.emailNotifications) {
      return NextResponse.json({ success: true, sent: false, reason: "notifications_disabled" });
    }

    let result: { sent: boolean; preview?: string };

    switch (type) {
      case "bookingConfirmation":
        result = await EmailService.sendBookingConfirmation(to, body.vars ?? {}, config);
        break;
      case "paymentReceived":
        result = await EmailService.sendPaymentReceived(to, body.vars ?? {}, config);
        break;
      default:
        return NextResponse.json(
          { success: false, error: `Unknown email type: ${type}` },
          { status: 400 },
        );
    }

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("[POST /api/email/send] Error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}