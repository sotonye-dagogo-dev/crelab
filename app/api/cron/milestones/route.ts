import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookingMilestones } from "@/drizzle/schema";
import { and, lt, eq } from "drizzle-orm";
import { MilestoneService } from "@/services/MilestoneService";

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { success: false, error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const now = new Date();

  const expiredMilestones = await db
    .select()
    .from(bookingMilestones)
    .where(
      and(
        eq(bookingMilestones.status, "SUBMITTED"),
        lt(bookingMilestones.reviewDeadline!, now),
      ),
    );

  let processed = 0;
  const errors: string[] = [];

  const milestoneService = new MilestoneService();

  for (const milestone of expiredMilestones) {
    try {
      await milestoneService.autoApproveMilestone(milestone.id);
      processed++;
    } catch (err) {
      errors.push(
        `Milestone ${milestone.id}: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  }

  return NextResponse.json({
    success: errors.length === 0,
    processed,
    errors,
  });
}
