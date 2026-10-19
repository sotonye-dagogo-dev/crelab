import { NextResponse } from "next/server";
import { EscrowService } from "@/services/EscrowService";
import { JobQueueService } from "@/services/JobQueueService";

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

  // Vercel Hobby runs this once per day — drain any DB-queued intra-day jobs
  // first (e.g. escrow sweeps enqueued at hold time for +6h/+12h/+24h), then
  // run the full idempotent sweep as the bulk safety net.
  let queueResult: Awaited<ReturnType<JobQueueService["drainDueJobs"]>> | null = null;
  try {
    queueResult = await new JobQueueService().drainDueJobs({ limit: 50 });
  } catch (err) {
    queueResult = {
      claimed: 0,
      completed: 0,
      failed: 0,
      skipped: 0,
      errors: [err instanceof Error ? err.message : "Unknown error draining job queue"],
    };
  }

  const sweep = await new EscrowService().runFullSweep();

  return NextResponse.json({
    success: sweep.totalErrors.length === 0 && (queueResult?.errors.length ?? 0) === 0,
    processed: sweep.totalProcessed + (queueResult?.completed ?? 0),
    errors: [...sweep.totalErrors, ...(queueResult?.errors ?? [])],
    details: { queue: queueResult, sweep: sweep.results },
  });
}
