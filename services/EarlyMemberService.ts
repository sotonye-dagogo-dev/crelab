import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { DEFAULT_CONFIG } from "@/config/platform.config";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import type { IEarlyMemberConfig, IPlatformConfig } from "@/types";

/**
 * Founding-100 status for one user. Derived entirely from `user.createdAt`
 * ordering — no schema change. `rank` is 1-based and deterministic
 * (`ORDER BY created_at, id`), so seeded/early accounts are counted too.
 */
export interface EarlyMemberStatus {
  /** Master switch — when false no rank was fetched and the badge must not render */
  enabled: boolean;
  isTop100: boolean;
  rank: number | null;
  limit: number;
  badgeLabel: string;
  title: string;
  description: string;
  showRank: boolean;
}

export const DEFAULT_FIRST_HUNDRED: IEarlyMemberConfig = DEFAULT_CONFIG.firstHundred ?? {
  enabled: false,
  limit: 100,
  badgeLabel: "Founding 100",
  title: "You're a founding member",
  description: "You joined during the first 100 registrations.",
  showRank: true,
};

/** Guard for admin-entered limits — falls back to the hardcoded default. */
export function normalizeFirstHundredLimit(raw?: number | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_FIRST_HUNDRED.limit;
  return Math.floor(n);
}

/** Pure config resolution: hardcoded defaults overridden by whatever config carries. */
export function resolveFirstHundredConfig(
  raw?: Partial<IEarlyMemberConfig> | null,
): IEarlyMemberConfig {
  if (!raw) return { ...DEFAULT_FIRST_HUNDRED };
  return {
    enabled: raw.enabled ?? DEFAULT_FIRST_HUNDRED.enabled,
    limit: normalizeFirstHundredLimit(raw.limit),
    badgeLabel: raw.badgeLabel || DEFAULT_FIRST_HUNDRED.badgeLabel,
    title: raw.title || DEFAULT_FIRST_HUNDRED.title,
    description: raw.description || DEFAULT_FIRST_HUNDRED.description,
    showRank: raw.showRank ?? DEFAULT_FIRST_HUNDRED.showRank,
  };
}

/** `isTop100 = rank <= limit` — ranks are 1-based, so rank 100 qualifies at limit 100. */
export function isFoundingMember(rank: number | null | undefined, limit: number): boolean {
  if (rank == null || !Number.isFinite(rank)) return false;
  if (rank < 1) return false;
  return rank <= Math.max(0, Math.floor(limit));
}

function toTime(value: Date | string): number {
  const t = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(t) ? t : Number.MAX_SAFE_INTEGER;
}

/**
 * Reference JS mirror of the SQL window function used by the service
 * (`ROW_NUMBER() OVER (ORDER BY created_at, id)`): 1-based rank of a user
 * within a registration-ordered list, deterministic tie-break on `id`.
 */
export function registrationRankFrom<T extends { id: string; createdAt: Date | string }>(
  rows: T[],
  userId: string,
): number | null {
  const sorted = [...rows].sort((a, b) => {
    const at = toTime(a.createdAt);
    const bt = toTime(b.createdAt);
    if (at !== bt) return at - bt;
    if (a.id === b.id) return 0;
    return a.id < b.id ? -1 : 1;
  });
  const index = sorted.findIndex((row) => row.id === userId);
  return index === -1 ? null : index + 1;
}

async function resolveConfig(): Promise<IEarlyMemberConfig> {
  let config: IPlatformConfig;
  try {
    config = await PlatformConfigService.getCached();
  } catch {
    config = DEFAULT_CONFIG;
  }
  return resolveFirstHundredConfig(config.firstHundred);
}

/** Ranks the whole `user` table once and picks this user's position out of it. */
async function fetchRank(userId: string): Promise<number | null> {
  const rows = await db.execute<{ rank: number | string | null }>(sql`
    SELECT ranked.rank
    FROM (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS rank
      FROM "user"
    ) ranked
    WHERE ranked.id = ${userId}
    LIMIT 1
  `);
  const raw = rows[0]?.rank;
  if (raw === null || raw === undefined) return null;
  const rank = Number(raw);
  return Number.isFinite(rank) ? rank : null;
}

const getCachedRank = unstable_cache(
  async (userId: string) => fetchRank(userId),
  ["early-member-registration-rank"],
  { revalidate: 300, tags: ["early-members"] },
);

export class EarlyMemberService {
  /**
   * Founding-100 status for a user. The feature flag is checked before any
   * query: flag off → no fetch, no rank, no badge.
   */
  static async getStatus(userId: string): Promise<EarlyMemberStatus> {
    const config = await resolveConfig();
    if (!config.enabled) {
      return { ...config, enabled: false, isTop100: false, rank: null };
    }

    let rank: number | null = null;
    try {
      rank = await getCachedRank(userId);
    } catch (err) {
      console.error("[EarlyMemberService] rank lookup failed", err);
    }

    return {
      ...config,
      enabled: true,
      rank,
      isTop100: isFoundingMember(rank, config.limit),
    };
  }
}
