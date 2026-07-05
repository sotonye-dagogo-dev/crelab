import { NextResponse } from "next/server";
import { EscrowService } from "@/services/EscrowService";

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { success: false, error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }

  const header = req.headers.get("x-cron-secret");
  if (header !== cronSecret) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const escrowService = new EscrowService();
  const results: Record<string, unknown> = {};

  try {
    const inProgressResult = await escrowService.setInProgress();
    results.setInProgress = inProgressResult;
  } catch (err) {
    results.setInProgress = {
      processed: 0,
      errors: [
        err instanceof Error ? err.message : "Unknown error in setInProgress",
      ],
    };
  }

  try {
    const autoReleaseResult = await escrowService.autoRelease();
    results.autoRelease = autoReleaseResult;
  } catch (err) {
    results.autoRelease = {
      processed: 0,
      errors: [
        err instanceof Error ? err.message : "Unknown error in autoRelease",
      ],
    };
  }

  const inProgressResult = results.setInProgress as { processed: number; errors: string[] } | undefined;
  const autoReleaseResult = results.autoRelease as { processed: number; errors: string[] } | undefined;

  const totalProcessed =
    (inProgressResult?.processed ?? 0) +
    (autoReleaseResult?.processed ?? 0);

  const totalErrors = [
    ...(inProgressResult?.errors ?? []),
    ...(autoReleaseResult?.errors ?? []),
  ];

  return NextResponse.json({
    success: totalErrors.length === 0,
    processed: totalProcessed,
    errors: totalErrors,
    details: results,
  });
}
