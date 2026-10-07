import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  bookings,
  portfolioItems,
  providers,
  referralEvents,
  reviews,
  user,
} from "@/drizzle/schema";
import { DEFAULT_CONFIG } from "@/config/platform.config";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import type {
  ILeaderboardConfig,
  ILeaderboardRow,
  IPlatformConfig,
  LeaderboardFactor,
} from "@/types";

/**
 * Runtime scoring factor — the pluggable registry row. Deliberately named
 * `LeaderboardRuntimeFactor` so it never clashes with the config-row type
 * `LeaderboardFactor` in `types/index.ts` (label, weight, showRawValue…).
 *
 * A factor owns its own data collection; ranking, weighting and pagination
 * never change when one is added or removed.
 */
export interface LeaderboardRuntimeFactor {
  /** Must match the config row key (`referrals`, `portfolio`, …) */
  key: string;
  /** Raw values keyed by userId — missing key means 0 */
  collect(): Promise<Record<string, number>>;
}

/** A registry factor merged with its resolved config row (enabled, label, weight…). */
export interface ResolvedLeaderboardFactor {
  key: string;
  label: string;
  description: string;
  weight: number;
  showRawValue: boolean;
  collect: LeaderboardRuntimeFactor["collect"];
}

/** Public, non-private identity shown on the board (never email, never ids in URLs). */
export interface LeaderboardCandidate {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface LeaderboardPage {
  rows: ILeaderboardRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  enabled: boolean;
  /** Metadata for the "How scoring works" transparency panel */
  factors: Array<Pick<ResolvedLeaderboardFactor, "key" | "label" | "description" | "weight" | "showRawValue">>;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/* ── Pure helpers (tested without a DB) ── */

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function normalizePageSize(raw?: number | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_PAGE_SIZE;
  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(n)));
}

/**
 * F7 ratings factor formula: `AVG(rating) × ln(1 + review count)`.
 *
 * The average keeps quality in charge while the natural-log term rewards
 * volume with diminishing returns — 100 reviews can't simply outvote a
 * well-rated profile that has a handful. Returns 0 for no reviews.
 */
export function ratingFactorValue(avgRating: number, reviewCount: number): number {
  const avg = Number(avgRating);
  const count = Number(reviewCount);
  if (!Number.isFinite(avg) || !Number.isFinite(count) || count <= 0 || avg <= 0) return 0;
  return round2(avg * Math.log(1 + count));
}

function mergeFactorRow(
  key: string,
  base: LeaderboardFactor | undefined,
  row: Partial<LeaderboardFactor> | undefined,
): LeaderboardFactor {
  const fallback: LeaderboardFactor = base ?? {
    key,
    enabled: true,
    label: key,
    description: "",
    weight: 1,
    showRawValue: false,
  };
  if (!row) return fallback;
  return {
    key,
    enabled: row.enabled ?? fallback.enabled,
    label: row.label ?? fallback.label,
    description: row.description ?? fallback.description,
    weight: typeof row.weight === "number" && Number.isFinite(row.weight) ? row.weight : fallback.weight,
    showRawValue: row.showRawValue ?? fallback.showRawValue,
  };
}

/** Merges DB-saved factor rows over the hardcoded defaults from `platform.config`. */
export function resolveLeaderboardConfig(config?: IPlatformConfig | null): ILeaderboardConfig {
  const base: ILeaderboardConfig = DEFAULT_CONFIG.leaderboard ?? {
    enabled: false,
    title: "Leaderboard",
    subtitle: "",
    howItWorksTitle: "How scoring works",
    pageSize: DEFAULT_PAGE_SIZE,
    factors: {},
  };
  const raw = config?.leaderboard;
  if (!raw) return base;

  const factors: Record<string, LeaderboardFactor> = {};
  const keys = new Set([
    ...Object.keys(base.factors ?? {}),
    ...Object.keys(raw.factors ?? {}),
  ]);
  for (const key of keys) {
    factors[key] = mergeFactorRow(key, base.factors?.[key], raw.factors?.[key]);
  }

  return {
    enabled: raw.enabled ?? base.enabled,
    title: raw.title || base.title,
    subtitle: raw.subtitle ?? base.subtitle,
    howItWorksTitle: raw.howItWorksTitle || base.howItWorksTitle,
    pageSize: normalizePageSize(raw.pageSize ?? base.pageSize),
    factors,
  };
}

/**
 * Registry ∩ config: factors the admin disabled (or that have no registry
 * implementation) are dropped, everything else keeps its config label,
 * description, weight and showRawValue. Order follows the registry.
 */
export function resolveEnabledFactors(
  configFactors?: Record<string, LeaderboardFactor> | null,
  registry: LeaderboardRuntimeFactor[] = LEADERBOARD_RUNTIME_FACTORS,
): ResolvedLeaderboardFactor[] {
  const defaults = DEFAULT_CONFIG.leaderboard?.factors ?? {};
  const resolved: ResolvedLeaderboardFactor[] = [];

  for (const factor of registry) {
    const row = mergeFactorRow(factor.key, defaults[factor.key], configFactors?.[factor.key]);
    if (!row.enabled) continue;
    resolved.push({
      key: row.key,
      label: row.label,
      description: row.description,
      weight: row.weight,
      showRawValue: row.showRawValue,
      collect: factor.collect,
    });
  }

  return resolved;
}

/**
 * Weighted scoring + ranking. Pure — callers pass already-collected raw values.
 *
 * - `score = Σ (weight × raw)` rounded to 2dp; `breakdown` keeps per-factor
 *   contributions so the UI can explain a rank.
 * - `rawValues` is attached only for factors with `showRawValue` — the
 *   referrals factor ships `showRawValue: false`, so its unscaled point total
 *   never leaves the server.
 * - Ranking is score DESC with a deterministic `userId` tie-break; rows with a
 *   score of 0 (no activity in any enabled factor) are not listed.
 */
export function scoreLeaderboard(
  candidates: LeaderboardCandidate[],
  rawByFactor: Record<string, Record<string, number>>,
  factors: Array<Pick<ResolvedLeaderboardFactor, "key" | "weight"> & { showRawValue?: boolean }>,
  opts: { currentUserId?: string | null } = {},
): ILeaderboardRow[] {
  const rows: ILeaderboardRow[] = [];

  for (const candidate of candidates) {
    let score = 0;
    const breakdown: Record<string, number> = {};
    const rawValues: Record<string, number> = {};

    for (const factor of factors) {
      const raw = Number(rawByFactor[factor.key]?.[candidate.userId] ?? 0) || 0;
      const contribution = round2(raw * factor.weight);
      breakdown[factor.key] = contribution;
      if (factor.showRawValue) rawValues[factor.key] = round2(raw);
      score += contribution;
    }

    score = round2(score);
    if (score <= 0) continue;

    rows.push({
      rank: 0,
      userId: candidate.userId,
      displayName: candidate.displayName,
      avatarUrl: candidate.avatarUrl,
      score,
      breakdown,
      ...(Object.keys(rawValues).length > 0 ? { rawValues } : {}),
      ...(opts.currentUserId ? { isCurrentUser: candidate.userId === opts.currentUserId } : {}),
    });
  }

  rows.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.userId === b.userId) return 0;
    return a.userId < b.userId ? -1 : 1;
  });
  rows.forEach((row, index) => {
    row.rank = index + 1;
  });
  return rows;
}

/** Offsets an already-ranked list into one page. Out-of-range pages clamp. */
export function paginateRows<T>(
  rows: T[],
  page?: number | null,
  pageSize?: number | null,
): { rows: T[]; page: number; pageSize: number; total: number; totalPages: number } {
  const size = normalizePageSize(pageSize);
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(Math.floor(Number(page) || 1), 1), totalPages);
  const start = (current - 1) * size;
  return {
    rows: rows.slice(start, start + size),
    page: current,
    pageSize: size,
    total,
    totalPages,
  };
}

/* ── Factor implementations (F7) ── */

function toValueMap(rows: Array<{ userId: string | null; total: unknown }>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of rows) {
    if (!row.userId) continue;
    const value = Number(row.total);
    if (Number.isFinite(value) && value > 0) out[row.userId] = value;
  }
  return out;
}

/** F2: SUM(points) over `referral_events`, grouped by earner. Identities never leave the query. */
async function collectReferralValues(): Promise<Record<string, number>> {
  const rows = await db
    .select({
      userId: referralEvents.userId,
      total: sql<number>`coalesce(sum(${referralEvents.points}), 0)`,
    })
    .from(referralEvents)
    .groupBy(referralEvents.userId);
  return toValueMap(rows);
}

/** F7: count of visible `portfolio_items` per user (via their provider profile). */
async function collectPortfolioValues(): Promise<Record<string, number>> {
  const rows = await db
    .select({
      userId: providers.userId,
      total: sql<number>`count(*)`,
    })
    .from(portfolioItems)
    .innerJoin(providers, eq(portfolioItems.providerId, providers.id))
    .where(eq(portfolioItems.visible, true))
    .groupBy(providers.userId);
  return toValueMap(rows);
}

/** F7: booking count per user — both sides of the booking (client + provider). */
async function collectBookingValues(): Promise<Record<string, number>> {
  const [asClient, asProvider] = await Promise.all([
    db
      .select({ userId: bookings.clientId, total: sql<number>`count(*)` })
      .from(bookings)
      .groupBy(bookings.clientId),
    db
      .select({ userId: providers.userId, total: sql<number>`count(*)` })
      .from(bookings)
      .innerJoin(providers, eq(bookings.providerId, providers.id))
      .groupBy(providers.userId),
  ]);

  const merged: Record<string, number> = {};
  for (const row of [...asClient, ...asProvider]) {
    if (!row.userId) continue;
    const value = Number(row.total);
    if (!Number.isFinite(value) || value <= 0) continue;
    merged[row.userId] = (merged[row.userId] ?? 0) + value;
  }
  return merged;
}

/** F7: `AVG(rating) × ln(1 + count)` per reviewed provider. */
async function collectRatingValues(): Promise<Record<string, number>> {
  const rows = await db
    .select({
      userId: providers.userId,
      avg: sql<number | null>`avg(${reviews.rating})`,
      count: sql<number>`count(*)`,
    })
    .from(reviews)
    .innerJoin(providers, eq(reviews.providerId, providers.id))
    .groupBy(providers.userId);

  const out: Record<string, number> = {};
  for (const row of rows) {
    if (!row.userId) continue;
    const value = ratingFactorValue(Number(row.avg ?? 0), Number(row.count));
    if (value > 0) out[row.userId] = value;
  }
  return out;
}

/** The four factors F2/F7 ship with. New factors are added here, nothing else changes. */
export const LEADERBOARD_RUNTIME_FACTORS: LeaderboardRuntimeFactor[] = [
  { key: "referrals", collect: collectReferralValues },
  { key: "portfolio", collect: collectPortfolioValues },
  { key: "bookings", collect: collectBookingValues },
  { key: "ratings", collect: collectRatingValues },
];

/* ── Service ── */

async function resolveConfig(): Promise<IPlatformConfig> {
  try {
    return await PlatformConfigService.getCached();
  } catch {
    return DEFAULT_CONFIG;
  }
}

/** Union of users with a positive raw value in at least one enabled factor. */
function candidateIds(rawByFactor: Record<string, Record<string, number>>): string[] {
  const ids = new Set<string>();
  for (const values of Object.values(rawByFactor)) {
    for (const [userId, raw] of Object.entries(values)) {
      if (Number(raw) > 0) ids.add(userId);
    }
  }
  return [...ids];
}

/** Public profile fields only: display name + avatar (provider first). */
async function loadCandidates(ids: string[]): Promise<LeaderboardCandidate[]> {
  if (ids.length === 0) return [];

  const [userRows, providerRows] = await Promise.all([
    db
      .select({ id: user.id, name: user.name, image: user.image })
      .from(user)
      .where(inArray(user.id, ids)),
    db
      .select({
        userId: providers.userId,
        displayName: providers.displayName,
        avatarUrl: providers.avatarUrl,
      })
      .from(providers)
      .where(inArray(providers.userId, ids)),
  ]);

  const providerByUser = new Map(providerRows.map((row) => [row.userId, row]));
  return userRows.map((row) => {
    const provider = providerByUser.get(row.id);
    return {
      userId: row.id,
      displayName: provider?.displayName || row.name || "Member",
      avatarUrl: provider?.avatarUrl || row.image || null,
    };
  });
}

export class LeaderboardService {
  /**
   * Paginated, weighted leaderboard. Each enabled factor collects its own raw
   * values (a failing factor contributes 0 instead of failing the page), rows
   * are scored and ranked, then sliced into the requested page.
   */
  static async getBoard(
    opts: { page?: number; pageSize?: number; currentUserId?: string | null } = {},
  ): Promise<LeaderboardPage> {
    const config = await resolveConfig();
    const leaderboard = resolveLeaderboardConfig(config);
    const flagOn = config.features?.referralsEnabled !== false && leaderboard.enabled;
    const pageSize = normalizePageSize(opts.pageSize ?? leaderboard.pageSize);
    const empty: LeaderboardPage = {
      rows: [],
      page: 1,
      pageSize,
      total: 0,
      totalPages: 1,
      enabled: false,
      factors: [],
    };
    if (!flagOn) return empty;

    const factors = resolveEnabledFactors(leaderboard.factors);
    const factorMeta = factors.map(({ key, label, description, weight, showRawValue }) => ({
      key,
      label,
      description,
      weight,
      showRawValue,
    }));

    const collected = await Promise.all(
      factors.map((factor) =>
        factor
          .collect()
          .catch((err) => {
            console.error(`[LeaderboardService] factor "${factor.key}" failed`, err);
            return {} as Record<string, number>;
          }),
      ),
    );
    const rawByFactor: Record<string, Record<string, number>> = {};
    factors.forEach((factor, index) => {
      rawByFactor[factor.key] = collected[index];
    });

    const candidates = await loadCandidates(candidateIds(rawByFactor));
    const ranked = scoreLeaderboard(candidates, rawByFactor, factors, {
      currentUserId: opts.currentUserId ?? null,
    });
    const paged = paginateRows(ranked, opts.page, pageSize);

    return {
      rows: paged.rows,
      page: paged.page,
      pageSize: paged.pageSize,
      total: paged.total,
      totalPages: paged.totalPages,
      enabled: true,
      factors: factorMeta,
    };
  }
}
