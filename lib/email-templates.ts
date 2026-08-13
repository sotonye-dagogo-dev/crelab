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
