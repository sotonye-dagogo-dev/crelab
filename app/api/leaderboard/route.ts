import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { LeaderboardService } from "@/services/LeaderboardService";

/**
 * Public, paginated leaderboard. Rows carry display name + avatar only —
 * never emails — and the session (when present) is used purely to flag the
 * signed-in user's own row for highlighting.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const rawPageSize = searchParams.get("pageSize");
    const parsedPageSize = rawPageSize ? Number.parseInt(rawPageSize, 10) : NaN;
    const pageSize = Number.isFinite(parsedPageSize) ? parsedPageSize : undefined;

    let currentUserId: string | null = null;
    try {
      const session = await auth.api.getSession({ headers: req.headers });
      currentUserId = session?.user?.id ?? null;
    } catch {
      // Public endpoint — anonymous visitors see the same board.
    }

    const board = await LeaderboardService.getBoard({ page, pageSize, currentUserId });
    return NextResponse.json({ success: true, data: board });
  } catch (err) {
    console.error("[GET /api/leaderboard] error", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
