import { NextResponse } from "next/server";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { DEFAULT_CONFIG } from "@/config/platform.config";
import { isResendConfigured } from "@/services/EmailService";

export async function GET() {
  let config;
  try {
    config = await PlatformConfigService.getCached();
  } catch {
    config = DEFAULT_CONFIG;
  }

  const emailConfig = config.emailConfig ?? DEFAULT_CONFIG.emailConfig;
  const emailNotifications = config.features?.emailNotifications ?? false;

  const enabledTemplates = Object.values(emailConfig?.templates ?? {}).filter(
    (t) => t.enabled,
  ).map((t) => t.subject);

  return NextResponse.json({
    success: true,
    data: {
      enabled: emailNotifications,
      resendConfigured: emailNotifications && isResendConfigured(),
      fromEmail: emailConfig?.fromEmail ?? null,
      fromName: emailConfig?.fromName ?? null,
      templateCount: enabledTemplates.length,
      templates: enabledTemplates,
    },
  });
}
