import { emailNotSentLabel, type EmailSendResult } from "@/services/EmailService";

/**
 * Outcome of an email-change request, decoupled from Next.js so it can be
 * unit-tested without mocking the framework.
 */
export interface EmailChangeOutcome {
  success: boolean;
  sent: boolean;
  reason?: string;
  error?: string;
  status?: number;
}

/**
 * Resolves the response body for a change-email request from the email-send
 * outcomes captured by the request-scoped sink.
 *
 * Guarantees that:
 * 1. A request that never attempted a send (e.g. Better Auth silently declining
 *    because the address already belongs to an account) is never reported as
 *    success.
 * 2. NO captured send may be addressed to the current/old address — every email
 *    emitted by the change flow must target the requested new address. If any
 *    send was aimed at the old address instead, a real error is surfaced rather
 *    than a false "confirmation sent" success.
 * 3. A failed send is reported with its human-readable reason.
 */
export function resolveEmailChangeOutcome(
  results: EmailSendResult[] | EmailSendResult | undefined,
  requestedNewEmail: string,
): EmailChangeOutcome {
  const normalizedRequested = requestedNewEmail.trim().toLowerCase();
  const captured = Array.isArray(results) ? results : results ? [results] : [];

  if (captured.length === 0) {
    return {
      success: true,
      sent: false,
      reason:
        "We couldn't send a confirmation to that address. If it is available, you'll receive a link to confirm the change.",
    };
  }

  // Any email aimed at a different address than the new one the user typed is a
  // bug — surface it instead of letting the UI claim the confirmation was sent
  // to the new inbox.
  const misaddressed = captured.find(
    (r) => r.to && r.to.toLowerCase() !== normalizedRequested,
  );
  if (misaddressed) {
    return {
      success: false,
      sent: false,
      status: 500,
      error:
        "The confirmation email was not sent to your new address. Please try again.",
    };
  }

  const failed = captured.find((r) => !r.sent);
  if (failed) {
    return {
      success: true,
      sent: false,
      reason: emailNotSentLabel(failed.reason) ?? undefined,
    };
  }

  return { success: true, sent: true };
}