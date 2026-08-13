import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { user, consentRecords } from "@/drizzle/schema";
import { inArray } from "drizzle-orm";
import { ConsentType } from "@/types";

/**
 * ADMIN-only email trigger. Supports:
 *  - { templateKey, to }            → test send to a single address
 *  - { templateKey, segment:"marketing" } → broadcast a template to every user
 *     who granted MARKETING consent during signup (config-gated + template-gated)
 */
export async function POST(req: NextRequest) {
  try {
    await requireRole("ADMIN");
    const { templateKey, to, segment } = await req.json();

    if (!templateKey) {
      return NextResponse.json(
        { success: false, error: "templateKey is required" },
        { status: 400 },
      );
    }

    const [{ EmailService }, { PlatformConfigService }] = await Promise.all([
      import("@/services/EmailService"),
      import("@/services/PlatformConfigService"),
    ]);
    const config = await PlatformConfigService.get();

    if (!config.features?.emailNotifications) {
      return NextResponse.json(
        { success: false, error: "Email notifications are disabled in platform config" },
        { status: 400 },
      );
    }

    const template = config.emailConfig?.templates?.[templateKey];
    if (!template) {
      return NextResponse.json(
        { success: false, error: `Unknown email template: ${templateKey}` },
        { status: 400 },
      );
    }
    if (!template.enabled) {
      return NextResponse.json(
        { success: false, error: "That template is disabled — enable it before sending" },
        { status: 400 },
      );
    }

    // Test send to a specific address.
    if (to) {
      const result = await EmailService.sendTemplate(to, templateKey, { userName: "there" }, config);
      return NextResponse.json({ success: true, sent: result.sent, preview: result.preview });
    }

    // Broadcast to marketing-consented users.
    if (segment === "marketing") {
      const granted = await db
        .select({ userId: consentRecords.userId })
        .from(consentRecords)
        .where(inArray(consentRecords.type, [ConsentType.MARKETING]));

      const userIds = granted.map((r) => r.userId);
      if (userIds.length === 0) {
        return NextResponse.json({
          success: true,
          sent: 0,
          skipped: 0,
          message: "No users have opted into marketing emails yet.",
        });
      }

      const users = await db
        .select({ id: user.id, name: user.name, email: user.email })
        .from(user)
        .where(inArray(user.id, userIds));

      let sent = 0;
      let skipped = 0;
      for (const u of users) {
        const result = await EmailService.sendTemplate(u.email, templateKey, { userName: u.name }, config);
        if (result.sent) sent++;
        else skipped++;
      }

      return NextResponse.json({
        success: true,
        sent,
        skipped,
        total: users.length,
        message: `Broadcast complete: ${sent} sent, ${skipped} skipped.`,
      });
    }

    return NextResponse.json(
      { success: false, error: "Provide either `to` for a test send or `segment: \"marketing\"` for a broadcast" },
      { status: 400 },
    );
  } catch (err) {
    if (err instanceof Error && (err.message === "Forbidden" || err.message === "Unauthorized")) {
      const status = err.message === "Forbidden" ? 403 : 401;
      return NextResponse.json({ success: false, error: err.message }, { status });
    }
    console.error("[POST /api/admin/email/send] Error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
