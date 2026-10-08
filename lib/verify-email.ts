import { eq, ilike } from "drizzle-orm";
import { db } from "@/lib/db";
import { user, verification } from "@/drizzle/schema";
import { EmailService, type EmailSendResult } from "@/services/EmailService";
import type { IPlatformConfig } from "@/types";

export const VERIFY_EMAIL_TTL_MS = 3600 * 1000; // 1 hour

/**
 * Canonical email form for verification matching + storage. Lowercasing here
 * is what makes the verify-then-update path case-insensitive: signup may
 * store `User@Mail.com` while the token identifier is stored lowercased.
 */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function baseUrl(): string {
  return process.env.BETTER_AUTH_URL || "http://localhost:3000";
}

/**
 * Builds the verification link. The token rides alone (`?token=…`) so the
 * verify page auto-verifies on load and only then redirects to `?done=1`.
 * (A link carrying `done=1` alongside the token used to render a false
 * success state without ever verifying — see the repair log.)
 */
export function buildVerifyUrl(token: string): string {
  return `${baseUrl()}/verify-email?token=${encodeURIComponent(token)}`;
}

export interface VerificationSendOutcome {
  sent: boolean;
  reason?: string;
  to: string;
  result: EmailSendResult;
}

/**
 * Server-side verification-mail sender shared by the public resend route and
 * the signup hook. Creates a one-hour token, resolves the recipient's display
 * name from the user row (falls back to "there"), and sends `verifyEmail`.
 * Never throws — callers decide how to surface `sent: false`.
 */
export async function sendVerificationEmailTo(
  rawEmail: string,
  config: IPlatformConfig,
): Promise<VerificationSendOutcome> {
  const to = normalizeEmail(rawEmail);
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + VERIFY_EMAIL_TTL_MS);

  await db.insert(verification).values({
    id: crypto.randomUUID(),
    identifier: to,
    value: token,
    expiresAt,
  });

  let displayName = "there";
  try {
    // Case-insensitive: the stored user.email may carry original casing.
    const rows = await db
      .select({ name: user.name })
      .from(user)
      .where(ilike(user.email, to))
      .limit(1);
    if (rows.length && rows[0].name) displayName = rows[0].name;
  } catch {
    // Name lookup is cosmetic — a missing row must not block the send.
  }

  const result = await EmailService.sendVerifyEmail(to, displayName, buildVerifyUrl(token), config);

  if (!result.sent) {
    // Don't leave dead tokens behind when the mail never went out.
    try {
      await db.delete(verification).where(eq(verification.value, token));
    } catch {
      // Cleanup is best-effort; the token simply expires.
    }
  }

  return { sent: result.sent, to, result, reason: result.reason };
}
