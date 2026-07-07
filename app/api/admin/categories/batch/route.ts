import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { z } from "zod";

const batchSchema = z.object({
  action: z.enum(["disable", "enable", "delete"]),
  ids: z.array(z.string()).min(1, "At least one slug is required"),
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
    const config = await PlatformConfigService.get();
    let updatedCategories = [...config.categories];

    switch (action) {
      case "disable":
      case "delete":
        updatedCategories = updatedCategories.map((c) =>
          ids.includes(c.slug) ? { ...c, active: false } : c,
        );
        break;
      case "enable":
        updatedCategories = updatedCategories.map((c) =>
          ids.includes(c.slug) ? { ...c, active: true } : c,
        );
        break;
    }

    await PlatformConfigService.set("categories", updatedCategories, session.user.id);

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
