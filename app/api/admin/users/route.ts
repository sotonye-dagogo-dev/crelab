import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/drizzle/schema";
import { ilike, or, desc } from "drizzle-orm";

/** ADMIN-only. Lists platform users with optional email/name search. */
export async function GET(req: NextRequest) {
  try {
    await requireRole("ADMIN");

    const search = req.nextUrl.searchParams.get("search") ?? "";
    const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? "100");
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 100;

    const where = search.trim()
      ? or(
          ilike(user.email, `%${search.trim()}%`),
          ilike(user.name, `%${search.trim()}%`),
        )
      : undefined;

    const rows = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        role: user.role,
        image: user.image,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(where)
      .orderBy(desc(user.createdAt))
      .limit(limit);

    return NextResponse.json({
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        emailVerified: r.emailVerified,
        role: r.role,
        image: r.image,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    if (err instanceof Error && (err.message === "Forbidden" || err.message === "Unauthorized")) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.message === "Forbidden" ? 403 : 401 });
    }
    console.error("[GET /api/admin/users] Error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
