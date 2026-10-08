import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { referralCodes, referralEvents } from "@/drizzle/schema";
import { DEFAULT_CONFIG } from "@/config/platform.config";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { appOrigin } from "@/lib/url";
import { normalizeReferralCode } from "@/lib/referral-cookie";
import type { IPlatformConfig, IReferralCode, IReferralSummary } from "@/types";

// Pure cookie helpers live in `lib/referral-cookie` so client components can
// use them without pulling server-only modules into the browser bundle.
export { REFERRAL_COOKIE, REFERRAL_COOKIE_MAX_AGE, normalizeReferralCode } from "@/lib/referral-cookie";

/** `referral_events.source` value for the standard invite programme. */
export const REFERRAL_SOURCE = "referral";

export type ReferralClaimStatus =
  | "claimed"
  | "already-claimed"
  | "no-code"
  | "self-referral"
  | "disabled";

export interface ReferralClaimResult {
  status: ReferralClaimStatus;
  /** Number of `referral_events` rows newly written (0 when idempotent) */
  awarded: number;
  /** Points actually awarded in this call */
  points: number;
}

/** One `referral_events` row before insert — built by the pure resolver below. */
export interface ReferralEventDraft {
  /** Who earns the points */
  userId: string;
  /** The account created through the referral */
  inviteeId: string;
  /** Direct owner of the code used (constant across degrees) */
  referrerId: string;
  code: string;
  degree: 1 | 2;
  points: number;
  source: string;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** 8-character unambiguous code (no 0/O/1/I). */
export function generateReferralCode(length = 8): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

/**
 * Pure degree resolution for one sign-up. Returns the rows to write, in order:
 *
 * - degree 1: the code owner earns `directPoints` for the invitee.
 * - degree 2: whoever referred the code owner earns `secondDegreePoints`
 *   (referral-of-referral). The same invitee therefore produces up to two rows
 *   owned by two different earners — never two rows for the same earner.
 *
 * Self-referral is blocked here (and again by the unique index): a code owner
 * matching the invitee yields no rows at all. A second-degree earner equal to
 * the invitee or to the code owner is skipped as well.
 */
export function resolveReferralEvents(params: {
  code: string;
  codeOwnerId: string;
  inviteeId: string;
  secondDegreeEarnerId?: string | null;
  directPoints: number;
  secondDegreePoints: number;
}): ReferralEventDraft[] {
  const { code, codeOwnerId, inviteeId, secondDegreeEarnerId, directPoints, secondDegreePoints } =
    params;

  if (!code || !codeOwnerId || !inviteeId) return [];
  if (codeOwnerId === inviteeId) return [];

  const base = {
    inviteeId,
    referrerId: codeOwnerId,
    code,
    source: REFERRAL_SOURCE,
  };

  const events: ReferralEventDraft[] = [
    { ...base, userId: codeOwnerId, degree: 1, points: directPoints },
  ];

  if (
    secondDegreeEarnerId &&
    secondDegreeEarnerId !== inviteeId &&
    secondDegreeEarnerId !== codeOwnerId
  ) {
    events.push({ ...base, userId: secondDegreeEarnerId, degree: 2, points: secondDegreePoints });
  }

  return events;
}

function mapCode(row: typeof referralCodes.$inferSelect): IReferralCode {
  return {
    id: row.id,
    userId: row.userId,
    code: row.code,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function resolveConfig(): Promise<IPlatformConfig> {
  try {
    return await PlatformConfigService.getCached();
  } catch {
    return DEFAULT_CONFIG;
  }
}

export class ReferralService {
  /**
   * Lazily issues the single per-user code. Insert races (two tabs, unique
   * `user_id`) and rare code collisions resolve by re-reading — never by
   * overwriting an existing code.
   */
  static async getOrCreateCode(userId: string): Promise<IReferralCode> {
    const existing = await db
      .select()
      .from(referralCodes)
      .where(eq(referralCodes.userId, userId))
      .limit(1);
    if (existing[0]) return mapCode(existing[0]);

    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateReferralCode();
      const inserted = await db
        .insert(referralCodes)
        .values({ id: crypto.randomUUID(), userId, code })
        .onConflictDoNothing()
        .returning();
      if (inserted[0]) return mapCode(inserted[0]);

      // Conflict was either the per-user unique or a code collision — re-read.
      const again = await db
        .select()
        .from(referralCodes)
        .where(eq(referralCodes.userId, userId))
        .limit(1);
      if (again[0]) return mapCode(again[0]);
    }

    throw new Error("Could not issue a referral code");
  }

  /** Summary for the `/referrals` page: share link + degree breakdown stats. */
  static async getSummary(userId: string, origin?: string): Promise<IReferralSummary> {
    const { code } = await this.getOrCreateCode(userId);

    const rows = await db
      .select({
        degree: referralEvents.degree,
        count: sql<number>`count(*)`,
        points: sql<number>`coalesce(sum(${referralEvents.points}), 0)`,
      })
      .from(referralEvents)
      .where(eq(referralEvents.userId, userId))
      .groupBy(referralEvents.degree);

    let directReferrals = 0;
    let secondDegreeReferrals = 0;
    let totalPoints = 0;
    for (const row of rows) {
      const count = Number(row.count) || 0;
      if (row.degree === 1) directReferrals = count;
      else if (row.degree === 2) secondDegreeReferrals = count;
      totalPoints += Number(row.points) || 0;
    }

    const base = (origin ?? appOrigin()).replace(/\/+$/, "");
    return {
      code,
      shareUrl: `${base}/register?ref=${code}`,
      totalPoints,
      directReferrals,
      secondDegreeReferrals,
      // Unique per (earner, degree) via the table's unique index, and an
      // invitee can only ever land on one degree for a given earner — so the
      // two counts never overlap and sum to the whole network size.
      inviteeCount: directReferrals + secondDegreeReferrals,
    };
  }

  /**
   * Idempotent claim: reads the referral code from the sign-up cookie and
   * writes the degree-1 row (plus the optional degree-2 row for the referrer's
   * own referrer) inside one transaction spanning `referral_codes` reads and
   * `referral_events` writes. Replaying a claim inserts nothing new.
   */
  static async claimFromCode(
    rawCode: string | null | undefined,
    inviteeId: string,
  ): Promise<ReferralClaimResult> {
    const config = await resolveConfig();
    const referralConfig = config.referral ?? DEFAULT_CONFIG.referral;
    if (config.features?.referralsEnabled === false || !referralConfig?.enabled) {
      return { status: "disabled", awarded: 0, points: 0 };
    }

    const code = normalizeReferralCode(rawCode);
    if (!code) return { status: "no-code", awarded: 0, points: 0 };

    let status: ReferralClaimStatus = "no-code";
    let awarded = 0;
    let points = 0;

    await db.transaction(async (tx) => {
      const codeRows = await tx
        .select()
        .from(referralCodes)
        .where(eq(referralCodes.code, code))
        .limit(1);
      const codeOwner = codeRows[0];
      if (!codeOwner) {
        status = "no-code";
        return;
      }

      if (codeOwner.userId === inviteeId) {
        // Blocked server-side — logged rather than silently ignored.
        console.warn("[ReferralService] self-referral blocked", { inviteeId, code });
        status = "self-referral";
        return;
      }

      // Degree-2 earner: whoever already referred the code owner.
      const parentRows = await tx
        .select({ userId: referralEvents.userId })
        .from(referralEvents)
        .where(
          and(
            eq(referralEvents.inviteeId, codeOwner.userId),
            eq(referralEvents.degree, 1),
            eq(referralEvents.source, REFERRAL_SOURCE),
          ),
        )
        .limit(1);

      const drafts = resolveReferralEvents({
        code,
        codeOwnerId: codeOwner.userId,
        inviteeId,
        secondDegreeEarnerId: parentRows[0]?.userId ?? null,
        directPoints: referralConfig.directPoints,
        secondDegreePoints: referralConfig.secondDegreePoints,
      });
      if (drafts.length === 0) {
        status = "self-referral";
        return;
      }

      for (const draft of drafts) {
        const inserted = await tx
          .insert(referralEvents)
          .values({
            id: crypto.randomUUID(),
            userId: draft.userId,
            inviteeId: draft.inviteeId,
            referrerId: draft.referrerId,
            code: draft.code,
            degree: draft.degree,
            points: draft.points,
            source: draft.source,
          })
          .onConflictDoNothing()
          .returning({ id: referralEvents.id });
        if (inserted.length > 0) {
          awarded += 1;
          points += draft.points;
        }
      }

      status = awarded > 0 ? "claimed" : "already-claimed";
    });

    return { status, awarded, points };
  }
}
