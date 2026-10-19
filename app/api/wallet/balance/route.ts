import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { WalletService } from "@/services/WalletService";
import { JobQueueService } from "@/services/JobQueueService";

export async function GET(_req: NextRequest) {
  try {
    const session = await requireAuth();

    // Warm-traffic opportunistic drain of DB-queued jobs (escrow sweeps).
    // Fire-and-forget + throttled inside the service — never delays or fails
    // the balance read.
    void new JobQueueService().maybeDrainOnRequest().catch(() => {});

    const walletService = new WalletService();
    const balance = await walletService.getBalance(session.user.id);

    return NextResponse.json({ success: true, data: balance });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
