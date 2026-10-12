import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { consentRecords } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { ConsentType } from "@/types";
import { DEFAULT_CONFIG } from "@/config/platform.config";
import { resolveAbsoluteUrl } from "@/lib/url";

/**
 * Blog newsletter subscription. Stores a granted MARKETING consent record so
 * the subscription is config-driven and manageable by admins (the same pool
 * used by "Send to Subscribers" on the email templates page). Requires a
 * signed-in account; anonymous readers are redirected to sign in.
 *
 * On a genuinely new opt-in (first subscribe or re-subscribe after opting
 * out) a wired `newsletterSubscription` welcome email is fired best-effort —
 * it never fails the subscribe. Re-subscribes while already granted skip the
 * email so the endpoint never spams.
 */
export async function POST(req: NextRequest) {
  try {
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Sign in to subscribe to the newsletter." },
        { status: 401 },
      );
    }

    const body = await req.json();
    const { email } = body;
    if (!email || !String(email).includes("@")) {
      return NextResponse.json(
        { success: false, error: "A valid email is required" },
        { status: 400 },
      );
    }

    const existing = await db
      .select()
      .from(consentRecords)
      .where(
        and(
          eq(consentRecords.userId, session.user.id),
          eq(consentRecords.type, ConsentType.MARKETING),
        ),
      )
      .limit(1);

    // New opt-in = no row yet, or a row currently not granted (opted out).
    // Already-granted re-submits are idempotent and skip the welcome email.
    const newlyGranted = existing.length === 0 || existing[0].granted !== true;

    if (existing.length === 0) {
      await db.insert(consentRecords).values({
        id: crypto.randomUUID(),
        userId: session.user.id,
        type: ConsentType.MARKETING,
        granted: true,
      });
    } else if (existing[0].granted !== true) {
      await db
        .update(consentRecords)
        .set({ granted: true })
        .where(eq(consentRecords.id, existing[0].id));
    }

    // Welcome email — non-blocking: a send failure never fails the subscribe
    // (mirrors the webinar registration confirmation email).
    let emailResult: { sent: boolean; reason?: string } | null = null;
    if (newlyGranted) {
      try {
        const { PlatformConfigService } = await import("@/services/PlatformConfigService");
        let config = DEFAULT_CONFIG;
        try {
          config = await PlatformConfigService.getCached();
        } catch {
          // Fall through with hardcoded defaults — the template + sender
          // both resolve from DEFAULT_CONFIG, so the send still works.
        }
        if (config.features?.emailNotifications) {
          const { EmailService } = await import("@/services/EmailService");
          const trimmedEmail = String(email).trim();
          const userName =
            (typeof session.user.name === "string" && session.user.name.trim()) ||
            trimmedEmail.split("@")[0] ||
            "there";
          const sendResult = await EmailService.sendNewsletterSubscription(
            trimmedEmail,
            { userName, exploreUrl: resolveAbsoluteUrl("/explore") },
            config,
          );
          emailResult = sendResult.sent
            ? { sent: true }
            : { sent: false, reason: sendResult.reason };
        }
      } catch (err) {
        console.error("[POST /api/newsletter] welcome email failed", err);
        emailResult = { sent: false, reason: err instanceof Error ? err.message : "send error" };
      }
    }

    return NextResponse.json({ success: true, email: emailResult });
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
