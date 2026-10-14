/**
 * Payout recipient code validation (Paystack transfer recipients).
 *
 * A recipient code is the handle the platform pays out to (`RCP_` + 4–64
 * alphanumerics). Format is validated at BOTH boundaries — client (inline
 * hint + disabled submit) and server (400 before any wallet debit) — because a
 * malformed code would otherwise debit the wallet first and then fail the
 * Paystack transfer. Ownership/existence of the recipient is enforced by
 * Paystack at transfer time; a failed transfer is refunded to the wallet by the
 * existing `transfer.failed` webhook path.
 */
export const RECIPIENT_CODE_PATTERN = /^RCP_[A-Za-z0-9]{4,64}$/;

export function isValidRecipientCode(code: string): boolean {
  return RECIPIENT_CODE_PATTERN.test(code.trim());
}

/** Shared inline hint for payout-details inputs. */
export const RECIPIENT_CODE_HINT =
  "Recipient codes start with RCP_ followed by letters or numbers (e.g. RCP_x8f2k4q9)";
