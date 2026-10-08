import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { DEFAULT_CONFIG } from "@/config/platform.config";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { WebinarError, WebinarService, type WebinarErrorCode } from "@/services/WebinarService";
import { formatWebinarStart, resolveWebinarsConfig } from "@/lib/webinars";
import { resolveAbsoluteUrl } from "@/lib/url";

/**
 * Reserve a seat on a webinar. Guests (name + email + explicit marketing
 * consent) and signed-in users (identity taken from the session) both work —
 * the endpoint is idempotent per email, so double submits resolve to a single
 * registration instead of an error.
 */
const bodySchema = z.object({
  email: z.string().trim().min(5).max(254).optional(),
  name: z.string().trim().min(1).max(120).optional(),
  /** NDPR: always present and explicit — false is a valid, stored answer. */
  consentMarketing: z.boolean(),
});

const ERROR_STATUS: Record<WebinarErrorCode, number> = {
  not_found: 404,
  inactive: 403,
  closed: 409,
  full: 409,
  invalid: 400,
  slug_taken: 409,
};

async function resolveConfig() {
  try {
    return await PlatformConfigService.getCached();
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const json = await req.json();
    const check = bodySchema.safeParse(json);
    if (!check.success) {
      return NextResponse.json(
        { success: false, data: null, error: check.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const config = await resolveConfig();
    if (config.features?.webinarsEnabled === false) {
      return NextResponse.json(
        { success: false, error: "Webinars are currently disabled" },
        { status: 403 },
      );
    }

    let session: { id: string; email: string; name: string } | null = null;
    try {
      const s = await auth.api.getSession({ headers: req.headers });
      if (s?.user) {
        session = {
          id: s.user.id,
          email: s.user.email,
          name: typeof s.user.name === "string" ? s.user.name : "",
        };
      }
    } catch {
      // Public endpoint — anonymous visitors register as guests.
    }

    const email = session?.email || check.data.email || null;
    if (!email) {
      return NextResponse.json(
        { success: false, data: null, error: { email: ["Email is required"] } },
        { status: 400 },
      );
    }
    const name = (session?.name || check.data.name || "").trim() || null;
    if (!name) {
      return NextResponse.json(
        { success: false, data: null, error: { name: ["Name is required"] } },
        { status: 400 },
      );
    }

    const result = await WebinarService.register({
      webinarId: id,
      email,
      name,
      consentMarketing: check.data.consentMarketing,
      userId: session?.id ?? null,
    });

    // Confirmation email — non-blocking: a send failure never fails the
    // registration (mirrors the bug-report status emails).
    let emailResult: { sent: boolean; reason?: string } | null = null;
    if (!result.alreadyRegistered && config.features?.emailNotifications) {
      try {
        const { EmailService } = await import("@/services/EmailService");
        const sendResult = await EmailService.sendWebinarRegistration(
          email,
          {
            userName: name,
            webinarTitle: result.webinar.title,
            startsAt:
              formatWebinarStart(result.webinar.startsAt, {
                timeZone: "Africa/Lagos",
                timeZoneLabel: "WAT",
              }) ?? "To be announced",
            joinUrl: resolveAbsoluteUrl(result.webinar.ctaHref ?? "/webinars"),
          },
          config,
        );
        emailResult = sendResult.sent
          ? { sent: true }
          : { sent: false, reason: sendResult.reason };
      } catch (err) {
        console.error("[POST /api/webinars/[id]/register] confirmation email failed", err);
        emailResult = { sent: false, reason: err instanceof Error ? err.message : "send error" };
      }
    }

    const webinarsConfig = resolveWebinarsConfig(config.webinars);
    const guest = session === null;

    return NextResponse.json(
      {
        success: true,
        data: {
          registration: result.registration,
          alreadyRegistered: result.alreadyRegistered,
          ...(guest
            ? {
                guestPrompt: {
                  message: webinarsConfig.guestPrompt,
                  ctaLabel: webinarsConfig.guestPromptCtaLabel,
                  href: "/register?returnTo=/webinars",
                },
              }
            : {}),
        },
        email: emailResult,
      },
      { status: result.alreadyRegistered ? 200 : 201 },
    );
  } catch (err) {
    if (err instanceof WebinarError) {
      return NextResponse.json(
        { success: false, error: err.message, code: err.code },
        { status: ERROR_STATUS[err.code] ?? 400 },
      );
    }
    if (err instanceof Error && (err.message === "Forbidden" || err.message === "Unauthorized")) {
      const status = err.message === "Forbidden" ? 403 : 401;
      return NextResponse.json({ success: false, error: err.message }, { status });
    }
    console.error("[POST /api/webinars/[id]/register] error", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
