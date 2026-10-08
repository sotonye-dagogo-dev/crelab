import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { teamMembers } from "@/drizzle/schema";
import type { ITeamMember } from "@/types";

/**
 * Team members: public listing for `/team` (+ `GET /api/team`).
 *
 * The public page previously queried `team_members` inline in the server
 * component with no `force-dynamic` flag, so Next statically prerendered the
 * (empty-at-build) result and later admin additions never appeared until a
 * rebuild. Centralising the read here + `force-dynamic` on the page keeps the
 * user-facing list live.
 */

export interface TeamSocialLink {
  platform: string;
  url: string;
}

type TeamRow = typeof teamMembers.$inferSelect;

/**
 * `social_links` is a jsonb array, but rows written before the platform
 * select (or the seed script's `JSON.stringify`) may hold a JSON string or
 * null. Normalise to an array so the UI's `Array.isArray` checks always hold.
 */
export function normalizeSocialLinks(value: unknown): TeamSocialLink[] {
  if (Array.isArray(value)) {
    return (value as unknown[]).filter(
      (l): l is TeamSocialLink =>
        typeof l === "object" &&
        l !== null &&
        typeof (l as Record<string, unknown>).platform === "string" &&
        typeof (l as Record<string, unknown>).url === "string" &&
        ((l as Record<string, unknown>).platform as string).trim().length > 0 &&
        ((l as Record<string, unknown>).url as string).trim().length > 0,
    ) as TeamSocialLink[];
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      return normalizeSocialLinks(JSON.parse(trimmed));
    } catch {
      return [];
    }
  }
  return [];
}

function toIso(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  return value;
}

export function serializeTeamMember(row: TeamRow): ITeamMember {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    bio: row.bio,
    avatarUrl: row.avatarUrl,
    socialLinks: normalizeSocialLinks(row.socialLinks),
    orderIndex: row.orderIndex,
    active: row.active,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

export class TeamService {
  /** Active members only, in display order — what `/team` renders. */
  static async listPublic(): Promise<ITeamMember[]> {
    const rows = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.active, true))
      .orderBy(asc(teamMembers.orderIndex), asc(teamMembers.createdAt));
    return rows.map(serializeTeamMember);
  }
}
