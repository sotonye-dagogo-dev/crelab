import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { user, consentRecords } from "@/drizzle/schema";
import { inArray } from "drizzle-orm";
import { ConsentType } from "@/types";
import { AuditService } from "@/services/AuditService";
import { emailNotSentLabel } from "@/services/EmailService";
import { MAX_BATCH_RECIPIENTS, buildBatchResultMessage, normalizeRecipientIds, partitionByVerification } from "@/lib/email-batch";
import { isWiredEmailTemplate, resolveEmailTemplate } from "@/lib/email-templates";

/**
 * ADMIN-only email trigger. Supports:
 *  - { templateKey, to }            → test send to a single address
 *  - { templateKey, segment:"marketing" } → broadcast a template to every user
 *     who granted MARKETING consent during signup (config-gated + template-gated)
 *  - { templateKey, recipientIds: string[] } → batch send to an explicit
 *     admin-selected recipient set (max 500, deduped)
 *
 * Wired (code-triggered) templates can never be sent or broadcast from here —
 * their delivery is owned by the code paths that fire them.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireRole("ADMIN");
    const { templateKey, to, segment, recipientIds } = await req.json();

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

    const template = resolveEmailTemplate(config, templateKey);
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

    // Wired templates are triggered by code, not by the admin. Blocking them
    // here (in addition to hiding the UI) prevents accidental test/broadcast
    // sends that would be out of step with the events that actually fire them.
    if (isWiredEmailTemplate(templateKey)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This template is wired to code and is triggered automatically by user events — it can only be previewed or simulated, not sent or broadcast.",
        },
        { status: 400 },
      );
    }

    // Test send to a specific address.
    if (to) {
      const result = await EmailService.sendTemplate(to, templateKey, { userName: "there" }, config);
      await AuditService.log({
        userId: session.user.id,
        action: "email.send.test",
        entity: "emailTemplate",
        entityId: templateKey,
        newValue: { to, sent: result.sent, templateKey },
      });
      if (!result.sent) {
        return NextResponse.json({
          success: true,
          sent: false,
          reason: emailNotSentLabel(result.reason),
          preview: result.preview,
        });
      }
      return NextResponse.json({ success: true, sent: true, preview: result.preview });
    }

    // Batch send to an explicit admin-selected recipient set.
    if (recipientIds !== undefined) {
      const ids = normalizeRecipientIds(recipientIds);
      if (ids.length === 0) {
        return NextResponse.json(
          { success: false, error: "Select at least one recipient for a batch send" },
          { status: 400 },
        );
      }
      if (Array.isArray(recipientIds) && recipientIds.length > MAX_BATCH_RECIPIENTS) {
        return NextResponse.json(
          { success: false, error: `Batch sends are limited to ${MAX_BATCH_RECIPIENTS} recipients at a time` },
          { status: 400 },
        );
      }

      const targets = await db
        .select({ id: user.id, name: user.name, email: user.email, emailVerified: user.emailVerified })
        .from(user)
        .where(inArray(user.id, ids));

      let sent = 0;
      let skipped = 0;
      for (const u of targets) {
        const result = await EmailService.sendTemplate(u.email, templateKey, { userName: u.name }, config);
        if (result.sent) sent++;
        else skipped++;
      }
      // Ids that no longer resolve to a user count as skipped.
      skipped += ids.length - targets.length;
      // Explicit selections are always honoured (the picker filters unverified
      // by default and requires an opt-in toggle), but the outcome reports how
      // many selected addresses are unverified so the admin can judge bounces.
      const { unverified } = partitionByVerification(targets);

      await AuditService.log({
        userId: session.user.id,
        action: "email.batch",
        entity: "emailTemplate",
        entityId: templateKey,
        newValue: { sent, skipped, total: ids.length, unverifiedIncluded: unverified.length },
      });

      return NextResponse.json({
        success: true,
        sent,
        skipped,
        total: ids.length,
        unverifiedIncluded: unverified.length,
        message: buildBatchResultMessage(sent, skipped, ids.length),
      });
    }

    // Broadcast to marketing-consented users.
    if (segment === "marketing") {
      const granted = await db
        .select({ userId: consentRecords.userId })
        .from(consentRecords)
        .where(inArray(consentRecords.type, [ConsentType.MARKETING]));

      const userIds = granted.map((r) => r.userId);
      if (userIds.length === 0) {
        await AuditService.log({
          userId: session.user.id,
          action: "email.broadcast",
          entity: "emailTemplate",
          entityId: templateKey,
          newValue: { segment, sent: 0, skipped: 0, total: 0 },
        });
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

      await AuditService.log({
        userId: session.user.id,
        action: "email.broadcast",
        entity: "emailTemplate",
        entityId: templateKey,
        newValue: { segment, sent, skipped, total: users.length },
      });

      return NextResponse.json({
        success: true,
        sent,
        skipped,
        total: users.length,
        message: `Broadcast complete: ${sent} sent, ${skipped} skipped.`,
      });
    }

    return NextResponse.json(
      { success: false, error: "Provide `to` for a test send, `segment: \"marketing\"` for a broadcast, or `recipientIds` for a batch send" },
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
