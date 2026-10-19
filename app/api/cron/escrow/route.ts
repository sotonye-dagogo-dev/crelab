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

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const escrowService = new EscrowService();
  const results: Record<string, unknown> = {};

  // Safety net first: re-check bookings that are still ACCEPTED + PENDING with
  // a stored card reference after the grace period — the "charged but never
  // held" state the webhook/verify failures used to leave behind — and hold
  // them when Paystack confirms the charge succeeded. Bounded + processor
  // verified, so it can never hold funds for an unpaid checkout.
  try {
    const reconcileResult = await escrowService.reconcileStuckHolds();
    results.reconcileStuckHolds = reconcileResult;
  } catch (err) {
    results.reconcileStuckHolds = {
      scanned: 0,
      held: 0,
      alreadyHeld: 0,
      needsReview: 0,
      skipped: 0,
      errors: [err instanceof Error ? err.message : "Unknown error in reconcileStuckHolds"],
    };
  }

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

  const reconcileResult = results.reconcileStuckHolds as { held: number; errors: string[] } | undefined;
  const inProgressResult = results.setInProgress as { processed: number; errors: string[] } | undefined;
  const autoReleaseResult = results.autoRelease as { processed: number; errors: string[] } | undefined;

  const totalProcessed =
    (reconcileResult?.held ?? 0) +
    (inProgressResult?.processed ?? 0) +
    (autoReleaseResult?.processed ?? 0);

  const totalErrors = [
    ...(reconcileResult?.errors ?? []),
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
