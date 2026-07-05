import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLog } from "@/drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { PlatformConfigService } from "@/services/PlatformConfigService";

export async function GET(req: NextRequest) {
  try {
    await requireRole("ADMIN");

    const { searchParams } = new URL(req.url);
    const isLog = searchParams.get("log") === "true";

    if (isLog) {
      const logs = await db
        .select()
        .from(auditLog)
        .where(eq(auditLog.action, "config.update"))
        .orderBy(desc(auditLog.createdAt))
        .limit(50);

      return NextResponse.json({
        success: true,
        data: logs.map((l) => ({
          id: l.id,
          entity: l.entity,
          oldValue: l.oldValue,
          newValue: l.newValue,
          createdAt: l.createdAt.toISOString(),
          userId: l.userId,
        })),
      });
    }

    const config = await PlatformConfigService.get();
    return NextResponse.json({ success: true, data: config });
  } catch (err) {
    if (err instanceof Error && err.message === "Forbidden") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireRole("ADMIN");
    const body = await req.json();
    const { key, value } = body;

    if (!key) {
      return NextResponse.json(
        { success: false, error: "Key is required" },
        { status: 400 },
      );
    }

    await PlatformConfigService.set(key, value, session.user.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "Forbidden") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
