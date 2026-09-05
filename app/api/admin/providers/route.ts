import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { providers, portfolioItems } from "@/drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    await requireRole("ADMIN");
    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all") === "true" || searchParams.get("all") === "1";
    const q = searchParams.get("q")?.trim() ?? "";

    const conditions: ReturnType<typeof sql>[] = [];
    if (!all) {
      conditions.push(eq(providers.active, true));
      conditions.push(eq(providers.verified, false));
    }
    if (q) {
      conditions.push(sql`${providers.displayName} ILIKE ${`%${q}%`}`);
    }

    const pendingProviders = await db
      .select({
        id: providers.id,
        displayName: providers.displayName,
        categorySlug: providers.categorySlug,
        createdAt: providers.createdAt,
        portfolioCount: sql<number>`(SELECT COUNT(*) FROM ${portfolioItems} WHERE ${portfolioItems.providerId} = ${providers.id})`,
      })
      .from(providers)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(providers.createdAt)
      .limit(all ? 100 : 50);

    return NextResponse.json({
      success: true,
      data: pendingProviders.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    if (err instanceof Error && (err.message === "Forbidden" || err.message === "Unauthorized")) {
      const status = err.message === "Forbidden" ? 403 : 401;
      return NextResponse.json({ success: false, error: err.message }, { status });
    }
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
