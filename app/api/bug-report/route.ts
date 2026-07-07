import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bugReports } from "@/drizzle/schema";
import { z } from "zod";
import { headers } from "next/headers";

const bodySchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200),
  description: z.string().min(20, "Description must be at least 20 characters").max(5000),
  stepsToReproduce: z.string().max(5000).optional(),
  expectedBehavior: z.string().max(2000).optional(),
  actualBehavior: z.string().max(2000).optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  pageUrl: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, data: null, error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const headerStore = await headers();
    const userAgent = headerStore.get("user-agent") ?? null;

    const report = {
      id: crypto.randomUUID(),
      title: parsed.data.title,
      description: parsed.data.description,
      stepsToReproduce: parsed.data.stepsToReproduce ?? null,
      expectedBehavior: parsed.data.expectedBehavior ?? null,
      actualBehavior: parsed.data.actualBehavior ?? null,
      severity: parsed.data.severity ?? "MEDIUM",
      status: "OPEN" as const,
      pageUrl: parsed.data.pageUrl ?? null,
      userAgent,
      attachments: [],
      adminNotes: null,
      resolvedAt: null,
      resolvedById: null,
      userId: null,
    };

    await db.insert(bugReports).values(report);

    return NextResponse.json({ success: true, data: null, error: null }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { success: false, data: null, error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
