import { DEFAULT_CONFIG } from "@/config/platform.config";
import { resolveAbsoluteUrl, resolveRelativeUrlsInHtml } from "@/lib/url";
import type { IEmailTemplate, IPlatformConfig } from "@/types";

type TemplateVars = Record<string, string>;

function fillTemplate(template: string, vars: TemplateVars): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

function getResendApiKey(): string | null {
  return process.env.RESEND_API_KEY ?? null;
}

/**
 * Resend is only available when RESEND_API_KEY is present. Email features must
 * check this and degrade gracefully (preview/console fallback) when absent.
 * Read at call time so availability reflects current runtime configuration.
 */
export function isResendConfigured(): boolean {
  return getResendApiKey() !== null;
}

export function getResendConfig(): { apiKeyPresent: boolean } {
  return { apiKeyPresent: isResendConfigured() };
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
    const baseVars: TemplateVars = {
      ...vars,
      name: cfg.name,
      // Resolve relative logo paths against the app origin so the image actually
      // renders inside email clients (a bare "/primary-logo.png" does not).
      logoUrl: resolveAbsoluteUrl(cfg.logoPath),
    };
    const subject = fillTemplate(template.subject, baseVars);
    // Resolve any remaining relative image/link URLs (e.g. a `/primary-logo.png`
    // added via the visual builder) to absolute so they render in email clients.
    const html = resolveRelativeUrlsInHtml(fillTemplate(template.bodyHtml, baseVars));

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
      exploreUrl: resolveAbsoluteUrl("/explore"),
    }, config);
  }

  static async sendVerifyEmail(
    to: string,
    userName: string,
    verifyUrl: string,
    config?: IPlatformConfig,
  ): Promise<{ sent: boolean; preview?: string }> {
    return EmailService.send(to, "verifyEmail", { userName, verifyUrl }, config);
  }

  static async sendEmailChanged(
    to: string,
    userName: string,
    config?: IPlatformConfig,
  ): Promise<{ sent: boolean; preview?: string }> {
    return EmailService.send(to, "emailChanged", { userName }, config);
  }

  /**
   * Send any configured template to a single address. Used by the admin email
   * manager for test sends and ad-hoc marketing messages.
   */
  static async sendTemplate(
    to: string,
    templateKey: string,
    vars: TemplateVars = {},
    config?: IPlatformConfig,
  ): Promise<{ sent: boolean; preview?: string }> {
    return EmailService.send(to, templateKey, vars, config);
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