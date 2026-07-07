import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { providers, auditLog } from "@/drizzle/schema";
import { inArray, eq } from "drizzle-orm";
import { z } from "zod";

const batchSchema = z.object({
  action: z.enum(["approve", "flag", "activate", "deactivate"]),
  ids: z.array(z.string()).min(1, "At least one id is required"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole("ADMIN");

    const parsed = batchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { action, ids } = parsed.data;

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    switch (action) {
      case "approve":
        updateData.verified = true;
        updateData.active = true;
        break;
      case "flag":
        updateData.active = false;
        break;
      case "activate":
        updateData.active = true;
        break;
      case "deactivate":
        updateData.active = false;
        break;
    }

    await db
      .update(providers)
      .set(updateData)
      .where(inArray(providers.id, ids));

    for (const id of ids) {
      await db.insert(auditLog).values({
        id: crypto.randomUUID(),
        userId: session.user.id,
        action: `provider.batch.${action}`,
        entity: "providers",
        entityId: id,
        oldValue: null,
        newValue: updateData,
      });
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
