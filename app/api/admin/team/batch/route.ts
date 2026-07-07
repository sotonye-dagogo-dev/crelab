import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { teamMembers } from "@/drizzle/schema";
import { requireRole } from "@/lib/auth";
import { inArray, eq } from "drizzle-orm";
import { z } from "zod";

const batchSchema = z.object({
  action: z.enum(["delete", "toggle", "activate", "deactivate"]),
  ids: z.array(z.string()).min(1, "At least one id is required"),
});

export async function POST(req: NextRequest) {
  try {
    await requireRole("ADMIN");

    const parsed = batchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { action, ids } = parsed.data;

    switch (action) {
      case "delete": {
        await db.delete(teamMembers).where(inArray(teamMembers.id, ids));
        break;
      }
      case "toggle": {
        const rows = await db
          .select({ id: teamMembers.id, active: teamMembers.active })
          .from(teamMembers)
          .where(inArray(teamMembers.id, ids));
        for (const row of rows) {
          await db
            .update(teamMembers)
            .set({ active: !row.active, updatedAt: new Date() })
            .where(eq(teamMembers.id, row.id));
        }
        break;
      }
      case "activate": {
        await db
          .update(teamMembers)
          .set({ active: true, updatedAt: new Date() })
          .where(inArray(teamMembers.id, ids));
        break;
      }
      case "deactivate": {
        await db
          .update(teamMembers)
          .set({ active: false, updatedAt: new Date() })
          .where(inArray(teamMembers.id, ids));
        break;
      }
    }

    return NextResponse.json({ success: true, data: null });
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
