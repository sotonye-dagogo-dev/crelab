import { DEFAULT_CONFIG } from "@/config/platform.config";
import { resolveAbsoluteUrl, resolveRelativeUrlsInHtml } from "@/lib/url";
import { resolveEmailTemplate, resolveEmailConfig } from "@/lib/email-templates";
import type { IPlatformConfig } from "@/types";

type TemplateVars = Record<string, string>;

/** Why an email was not dispatched. Surfaced to the UI so users get accurate
 *  feedback instead of silently assuming a mail was sent. */
export type EmailNotSentReason =
  | "template_missing"
  | "template_disabled"
  | "resend_not_configured"
  | "network_error"
  | "resend_api_error";

export interface EmailSendResult {
  sent: boolean;
  preview?: string;
  reason?: EmailNotSentReason;
  error?: string;
}

const RESEND_FETCH_TIMEOUT_MS = 10_000;

/**
 * Resend recommends NOT using a "no-reply" address (a one-way address lowers
 * trust and prevents recipients from replying — e.g. to report spam) and using
 * a subdomain instead of the root domain so sending is segmented by purpose and
 * root-domain reputation is protected. The default below follows both: a real
 * local-part on a `mail.` subdomain. Override per environment via
 * `RESEND_FROM_EMAIL` / `RESEND_FROM_NAME` (the subdomain must be verified in
 * Resend before mail will deliver).
 */
export const DEFAULT_FROM_EMAIL = "hello@mail.crellab.com";

function fillTemplate(template: string, vars: TemplateVars): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}`);
}

function getResendApiKey(): string | null {
  return process.env.RESEND_API_KEY ?? null;
}

/**
 * Resolves the sender identity for a send, honouring per-environment overrides
 * (`RESEND_FROM_NAME` / `RESEND_FROM_EMAIL`) above the admin-editable config,
 * then the hardcoded default. Read at call time so changes apply immediately.
 */
export function getResendSender(config?: IPlatformConfig): {
  fromName: string;
  fromEmail: string;
} {
  const resolved = resolveEmailConfig(config);
  return {
    fromName: process.env.RESEND_FROM_NAME ?? resolved.fromName ?? DEFAULT_CONFIG.name,
    fromEmail: process.env.RESEND_FROM_EMAIL ?? resolved.fromEmail ?? DEFAULT_FROM_EMAIL,
  };
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
  ): Promise<EmailSendResult> {
    const cfg = config ?? DEFAULT_CONFIG;
    // Resolve the template against the merged set: hardcoded defaults apply when
    // the template was never saved to the DB/admin config.
    const template = resolveEmailTemplate(cfg, templateKey);

    if (!template) {
      console.warn(
        `[EmailService] Template "${templateKey}" not found in config; email NOT sent to ${to}.`,
      );
      return { sent: false, reason: "template_missing" };
    }

    if (!template.enabled) {
      console.warn(
        `[EmailService] Template "${templateKey}" is disabled; email NOT sent to ${to}.`,
      );
      return { sent: false, reason: "template_disabled" };
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

    if (!apiKey) {
      console.warn(
        `[EmailService] RESEND_API_KEY not configured; "${templateKey}" email to ${to} NOT sent (preview fallback).`,
      );
      return { sent: false, preview: html, reason: "resend_not_configured" };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RESEND_FETCH_TIMEOUT_MS);
    const sender = getResendSender(cfg);

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: `${sender.fromName} <${sender.fromEmail}>`,
          to: [to],
          subject,
          html,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.text();
        console.error(
          `[EmailService] Resend API rejected "${templateKey}" email to ${to} (${res.status} ${res.statusText}):`,
          body,
        );
        return { sent: false, preview: html, reason: "resend_api_error", error: body };
      }

      return { sent: true };
    } catch (err) {
      const isTimeout = controller.signal.aborted;
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[EmailService] Failed to send "${templateKey}" email to ${to}: ${isTimeout ? `timed out after ${RESEND_FETCH_TIMEOUT_MS}ms (network failure)` : message}`,
      );
      return {
        sent: false,
        preview: html,
        reason: "network_error",
        error: isTimeout ? "Request timed out (network failure)" : message,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  static async sendWelcome(
    to: string,
    userName: string,
    config?: IPlatformConfig,
  ): Promise<EmailSendResult> {
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
  ): Promise<EmailSendResult> {
    return EmailService.send(to, "verifyEmail", { userName, verifyUrl }, config);
  }

  static async sendEmailChanged(
    to: string,
    userName: string,
    config?: IPlatformConfig,
  ): Promise<EmailSendResult> {
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
  ): Promise<EmailSendResult> {
    return EmailService.send(to, templateKey, vars, config);
  }

  static async sendBookingConfirmation(
    to: string,
    vars: { userName: string; providerName: string; packageName: string; bookingDate: string; amount: string; bookingUrl: string },
    config?: IPlatformConfig,
  ): Promise<EmailSendResult> {
    return EmailService.send(to, "bookingConfirmation", vars, config);
  }

  static async sendPaymentReceived(
    to: string,
    vars: { userName: string; providerName: string; amount: string; bookingUrl: string },
    config?: IPlatformConfig,
  ): Promise<EmailSendResult> {
    return EmailService.send(to, "paymentReceived", vars, config);
  }
}