import { DEFAULT_CONFIG } from "@/config/platform.config";
import type { IEmailTemplate, IPlatformConfig } from "@/types";

type TemplateVars = Record<string, string>;

function fillTemplate(template: string, vars: TemplateVars): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

function getResendApiKey(): string | null {
  return process.env.RESEND_API_KEY ?? null;
}

export class EmailService {
  static async send(
    to: string,
    templateKey: string,
    vars: TemplateVars,
    config?: IPlatformConfig,
  ): Promise<{ sent: boolean; preview?: string }> {
    const cfg = config ?? DEFAULT_CONFIG;
    const template = cfg.emailConfig?.templates?.[templateKey] as IEmailTemplate | undefined;

    if (!template || !template.enabled) {
      return { sent: false };
    }

    const apiKey = getResendApiKey();
    const subject = fillTemplate(template.subject, vars);
    const html = fillTemplate(template.bodyHtml, {
      ...vars,
      name: cfg.name,
      logoUrl: cfg.logoPath,
    });

    if (apiKey) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            from: `${cfg.emailConfig?.fromName ?? cfg.name} <${cfg.emailConfig?.fromEmail ?? "noreply@crellab.com"}>`,
            to: [to],
            subject,
            html,
          }),
        });

        if (!res.ok) {
          const body = await res.text();
          console.error("[EmailService] Resend error:", body);
          return { sent: false, preview: html };
        }

        return { sent: true };
      } catch (err) {
        console.error("[EmailService] Failed to send via Resend:", err);
        return { sent: false, preview: html };
      }
    }

    return { sent: false, preview: html };
  }

  static async sendWelcome(
    to: string,
    userName: string,
    config?: IPlatformConfig,
  ): Promise<{ sent: boolean; preview?: string }> {
    return EmailService.send(to, "welcome", {
      userName,
      exploreUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/explore`,
    }, config);
  }

  static async sendBookingConfirmation(
    to: string,
    vars: { userName: string; providerName: string; packageName: string; bookingDate: string; amount: string; bookingUrl: string },
    config?: IPlatformConfig,
  ): Promise<{ sent: boolean; preview?: string }> {
    return EmailService.send(to, "bookingConfirmation", vars, config);
  }

  static async sendPaymentReceived(
    to: string,
    vars: { userName: string; providerName: string; amount: string; bookingUrl: string },
    config?: IPlatformConfig,
  ): Promise<{ sent: boolean; preview?: string }> {
    return EmailService.send(to, "paymentReceived", vars, config);
  }
}