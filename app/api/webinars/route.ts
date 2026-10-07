import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_PUBLIC_PAGE_SIZE,
  MAX_PUBLIC_PAGE_SIZE,
  WebinarService,
} from "@/services/WebinarService";

/**
 * Public webinar listing (guest browse). Returns both page sections in one
 * response so the landing page can render hero + lists from a single request:
 * `{ upcoming, past }`, each a paginated `{ items, page, pageSize, total, totalPages }`.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parse = (key: string): number | undefined => {
      const raw = searchParams.get(key);
      if (raw === null) return undefined;
      const value = Number.parseInt(raw, 10);
      return Number.isFinite(value) ? value : undefined;
    };

    const pageSize = Math.min(MAX_PUBLIC_PAGE_SIZE, parse("pageSize") ?? DEFAULT_PUBLIC_PAGE_SIZE);
    const [upcoming, past] = await Promise.all([
      WebinarService.listPublic("upcoming", { page: parse("upcomingPage"), pageSize }),
      WebinarService.listPublic("past", { page: parse("pastPage"), pageSize }),
    ]);

    return NextResponse.json({ success: true, data: { upcoming, past } });
  } catch (err) {
    console.error("[GET /api/webinars] error", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
