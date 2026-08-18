import { DEFAULT_CONFIG } from "@/config/platform.config";
import type { IEmailConfig, IEmailTemplate, IPlatformConfig } from "@/types";

/**
 * Wired email templates — transactional emails that are triggered by code
 * events (user signup, email verification, password reset, booking lifecycle)
 * rather than being sent ad-hoc from the admin panel.
 *
 * These templates can be previewed and simulated in the admin, but they cannot
 * be sent directly or broadcast to a segment, because their content and timing
 * is owned by the code paths that trigger them. Admin-created templates (any
 * key not in this map) are not wired to code and CAN be sent/broadcast.
 *
 * `trigger` describes the user event that fires each email, surfaced in the
 * admin UI so it is clear to the operator that the template is code-wired.
 */
export const WIRED_EMAIL_TEMPLATES: Record<
  string,
  { label: string; trigger: string }
> = {
  welcome: {
    label: "Welcome",
    trigger:
      "Sent automatically when a new account is created (email sign-up, Google sign-up, or successful email verification).",
  },
  verifyEmail: {
    label: "Verify Email",
    trigger:
      "Sent when a user requests email verification, or when they change their email address (verification of the new address).",
  },
  emailChanged: {
    label: "Email Changed",
    trigger: "Sent when a user successfully changes their account email address.",
  },
  bookingConfirmation: {
    label: "Booking Confirmation",
    trigger: "Sent to the client when a booking is confirmed.",
  },
  paymentReceived: {
    label: "Payment Received",
    trigger: "Sent to the client when a payment is received for a booking.",
  },
  passwordReset: {
    label: "Password Reset",
    trigger: "Sent when a user requests a password reset link.",
  },
};

export function isWiredEmailTemplate(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(WIRED_EMAIL_TEMPLATES, key);
}

/**
 * Effective email template set for a given config: the hardcoded defaults
 * merged under whatever the DB/admin config actually saved. DB values win on
 * conflicts, hardcoded defaults fill any keys that were never saved to the DB
 * (e.g. a wired template like `verifyEmail` added to code after the operator
 * last saved the template set), and admin-created keys are preserved.
 */
export function resolveEmailTemplates(
  config?: Pick<IPlatformConfig, "emailConfig"> | null,
): Record<string, IEmailTemplate> {
  const defaults = DEFAULT_CONFIG.emailConfig?.templates ?? {};
  const configured = config?.emailConfig?.templates ?? {};
  return { ...defaults, ...configured };
}

/**
 * The effective email config (sender identity + merged template set) for a
 * given config, falling back to hardcoded defaults for any field/template not
 * saved in the DB/admin config.
 */
export function resolveEmailConfig(
  config?: Pick<IPlatformConfig, "emailConfig"> | null,
): IEmailConfig {
  const defaults = DEFAULT_CONFIG.emailConfig ?? { fromName: "", fromEmail: "", templates: {} };
  const configured = config?.emailConfig;
  return {
    fromName: configured?.fromName ?? defaults.fromName,
    fromEmail: configured?.fromEmail ?? defaults.fromEmail,
    templates: resolveEmailTemplates(config),
  };
}

/**
 * Resolves a single template by key, applying the hardcoded default whenever
 * the key was not saved into the config/DB. Returns undefined only when no
 * hardcoded version exists either (truly unknown key).
 */
export function resolveEmailTemplate(
  config: Pick<IPlatformConfig, "emailConfig"> | null | undefined,
  key: string,
): IEmailTemplate | undefined {
  return resolveEmailTemplates(config)[key];
}
