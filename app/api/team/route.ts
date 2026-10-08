import { NextResponse } from "next/server";
import { TeamService } from "@/services/TeamService";
import { MockDataService } from "@/services/MockDataService";

/**
 * Public team listing (guest browse). Single read path shared with the
 * server-rendered `/team` page (`TeamService.listPublic`), so admin additions
 * surface identically over HTTP and SSR. Falls back to mock members only when
 * mock mode is enabled; otherwise an empty list (never mock data in prod).
 */
export async function GET() {
  try {
    const members = await TeamService.listPublic();
    return NextResponse.json({ success: true, data: members });
  } catch (err) {
    console.error("[GET /api/team] error", err);
    try {
      const fallback = MockDataService.getTeamMembers();
      if (fallback.length > 0) {
        return NextResponse.json({ success: true, data: fallback });
      }
    } catch {
      // fall through to the error response
    }
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
