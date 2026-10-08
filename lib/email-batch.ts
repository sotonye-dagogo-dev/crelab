/**
 * Pure helpers for the admin email batch-send flow.
 *
 * Batch send lets an admin pick an explicit recipient set (checkboxes +
 * select-all / clear / undo / invert + quick filters) instead of only a
 * single test address or the whole marketing segment. All functions here are
 * side-effect free so they are unit-testable without a DB.
 */

export const MAX_BATCH_RECIPIENTS = 500;

export type EmailRecipientRole = "CLIENT" | "PROVIDER" | "ADMIN";

export interface EmailRecipient {
  id: string;
  name: string;
  email: string;
  role: EmailRecipientRole | string;
  /** Whether the address completed email verification. Unverified addresses
   *  are hidden from the picker by default (opt-in via the toggle) because
   *  they may bounce. Optional for backward compatibility with older payloads. */
  emailVerified?: boolean;
  hasMarketingConsent: boolean;
  createdAt: string;
}

export interface RecipientFilter {
  search?: string;
  role?: "ALL" | EmailRecipientRole;
  consent?: "ALL" | "SUBSCRIBERS";
  verified?: "ALL" | "VERIFIED" | "UNVERIFIED";
  limit?: number;
}

/**
 * Normalises a raw recipient-id payload: trims, drops empties, dedupes
 * (first occurrence wins), and caps at MAX_BATCH_RECIPIENTS.
 */
export function normalizeRecipientIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string") continue;
    const id = entry.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= MAX_BATCH_RECIPIENTS) break;
  }
  return out;
}

/**
 * Applies the picker filters to an in-memory recipient list. Search matches
 * name or email case-insensitively; role/consent narrow the set; limit takes
 * the first N (used by the "First 100" quick filter).
 */
export function filterRecipients(
  recipients: EmailRecipient[],
  filter: RecipientFilter,
): EmailRecipient[] {
  const search = (filter.search ?? "").trim().toLowerCase();
  let out = recipients;
  if (filter.role && filter.role !== "ALL") {
    out = out.filter((r) => r.role === filter.role);
  }
  if (filter.consent === "SUBSCRIBERS") {
    out = out.filter((r) => r.hasMarketingConsent);
  }
  if (filter.verified === "VERIFIED") {
    out = out.filter((r) => r.emailVerified !== false);
  } else if (filter.verified === "UNVERIFIED") {
    out = out.filter((r) => r.emailVerified === false);
  }
  if (search) {
    out = out.filter(
      (r) =>
        r.name.toLowerCase().includes(search) ||
        r.email.toLowerCase().includes(search),
    );
  }
  if (typeof filter.limit === "number" && filter.limit >= 0) {
    out = out.slice(0, filter.limit);
  }
  return out;
}

/** Returns the ids in `visibleIds` that are NOT in `selected`. */
export function invertSelection(
  visibleIds: string[],
  selected: Set<string> | string[],
): string[] {
  const sel = selected instanceof Set ? selected : new Set(selected);
  return visibleIds.filter((id) => !sel.has(id));
}

/**
 * Splits a recipient set into verified / unverified buckets (missing flag
 * counts as verified — legacy payloads predate the field). Used by the batch
 * send route to report how many selected addresses are unverified.
 */
export function partitionByVerification(recipients: Pick<EmailRecipient, "id" | "emailVerified">[]): {
  verified: string[];
  unverified: string[];
} {
  const verified: string[] = [];
  const unverified: string[] = [];
  for (const r of recipients) {
    if (r.emailVerified === false) unverified.push(r.id);
    else verified.push(r.id);
  }
  return { verified, unverified };
}

export function buildBatchResultMessage(
  sent: number,
  skipped: number,
  total: number,
): string {
  return `Batch send complete: ${sent} sent, ${skipped} skipped (${total} selected).`;
}
