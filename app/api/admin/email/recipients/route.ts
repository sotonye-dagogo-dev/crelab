import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { user, consentRecords } from "@/drizzle/schema";
import { ilike, or, eq, inArray, desc, and, sql } from "drizzle-orm";
import { ConsentType } from "@/types";

/**
 * ADMIN-only recipient picker source for email batch send.
 *
 * Query params:
 *  - search?: matches name or email (ilike)
 *  - role?: CLIENT | PROVIDER | ADMIN | ALL (default ALL)
 *  - consent?: all | marketing (default all; marketing = MARKETING-consented only)
 *  - verified?: all | verified | unverified (default all — the picker UI defaults
 *    to verified-only and opts in explicitly; the API stays unfiltered by default
 *    so existing callers are unaffected)
 *  - limit?: 1..500 (default 100)
 *  - offset?: >= 0 (default 0)
 *
 * Returns `{ success, data: [{ id, name, email, role, emailVerified, hasMarketingConsent, createdAt }], total }`.
 */
export async function GET(req: NextRequest) {
  try {
    await requireRole("ADMIN");

    const params = req.nextUrl.searchParams;
    const search = (params.get("search") ?? "").trim();
    const roleRaw = (params.get("role") ?? "ALL").trim().toUpperCase();
    const role =
      roleRaw === "CLIENT" || roleRaw === "PROVIDER" || roleRaw === "ADMIN"
        ? roleRaw
        : null;
    const consent = (params.get("consent") ?? "all").trim().toLowerCase();
    const marketingOnly = consent === "marketing" || consent === "subscribers";
    const verifiedRaw = (params.get("verified") ?? "all").trim().toLowerCase();
    const verifiedFilter =
      verifiedRaw === "verified" || verifiedRaw === "unverified" ? verifiedRaw : null;
    const limitRaw = Number(params.get("limit") ?? "100");
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(Math.floor(limitRaw), 1), 500)
      : 100;
    const offsetRaw = Number(params.get("offset") ?? "0");
    const offset = Number.isFinite(offsetRaw) ? Math.max(Math.floor(offsetRaw), 0) : 0;

    const conditions = [];
    if (search) {
      conditions.push(
        or(ilike(user.email, `%${search}%`), ilike(user.name, `%${search}%`)),
      );
    }
    if (role) {
      conditions.push(eq(user.role, role as "CLIENT" | "PROVIDER" | "ADMIN"));
    }
    if (verifiedFilter === "verified") {
      conditions.push(eq(user.emailVerified, true));
    } else if (verifiedFilter === "unverified") {
      conditions.push(eq(user.emailVerified, false));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    // Marketing-consented user ids (small table; single query, reused for the
    // flag and for the marketing-only filter).
    const granted = await db
      .select({ userId: consentRecords.userId })
      .from(consentRecords)
      .where(inArray(consentRecords.type, [ConsentType.MARKETING]));
    const consentedIds = new Set(granted.map((r) => r.userId));

    type RecipientRow = {
      id: string;
      name: string;
      email: string;
      role: "CLIENT" | "PROVIDER" | "ADMIN";
      emailVerified: boolean;
      createdAt: Date;
    };
    let rows: RecipientRow[];
    let total: number;
    if (marketingOnly) {
      const ids = [...consentedIds];
      if (ids.length === 0) {
        return NextResponse.json({ success: true, data: [], total: 0 });
      }
      const idChunks: string[][] = [];
      for (let i = 0; i < ids.length; i += 500) idChunks.push(ids.slice(i, i + 500));
      const all: RecipientRow[] = [];
      for (const chunk of idChunks) {
        const chunkWhere = where
          ? and(where, inArray(user.id, chunk))
          : inArray(user.id, chunk);
        const chunkRows = await db
          .select({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            emailVerified: user.emailVerified,
            createdAt: user.createdAt,
          })
          .from(user)
          .where(chunkWhere)
          .orderBy(desc(user.createdAt));
        all.push(...chunkRows);
      }
      total = all.length;
      rows = all.slice(offset, offset + limit);
    } else {
      const countRows = await db
        .select({ count: sql<number>`count(*)` })
        .from(user)
        .where(where);
      total = Number(countRows[0]?.count ?? 0);
      rows = await db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
        })
        .from(user)
        .where(where)
        .orderBy(desc(user.createdAt))
        .limit(limit)
        .offset(offset);
    }

    return NextResponse.json({
      success: true,
      data: rows.map((r: RecipientRow) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        role: r.role,
        emailVerified: r.emailVerified,
        hasMarketingConsent: consentedIds.has(r.id),
        createdAt: r.createdAt.toISOString(),
      })),
      total,
    });
  } catch (err) {
    if (err instanceof Error && (err.message === "Forbidden" || err.message === "Unauthorized")) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: err.message === "Forbidden" ? 403 : 401 },
      );
    }
    console.error("[GET /api/admin/email/recipients] Error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
