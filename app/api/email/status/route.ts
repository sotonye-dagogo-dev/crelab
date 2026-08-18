import { NextResponse } from "next/server";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { DEFAULT_CONFIG } from "@/config/platform.config";
import { isResendConfigured, getResendSender } from "@/services/EmailService";
import { resolveEmailTemplates } from "@/lib/email-templates";

export async function GET() {
  let config;
  try {
    config = await PlatformConfigService.getCached();
  } catch {
    config = DEFAULT_CONFIG;
  }

  const emailNotifications = config.features?.emailNotifications ?? false;
  const sender = getResendSender(config);

  const enabledTemplates = Object.values(resolveEmailTemplates(config)).filter(
    (t) => t.enabled,
  ).map((t) => t.subject);

  return NextResponse.json({
    success: true,
    data: {
      enabled: emailNotifications,
      resendConfigured: emailNotifications && isResendConfigured(),
      fromEmail: sender.fromEmail,
      fromName: sender.fromName,
      templateCount: enabledTemplates.length,
      templates: enabledTemplates,
    },
  });
}
