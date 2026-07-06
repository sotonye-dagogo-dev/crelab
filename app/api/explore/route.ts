import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ExploreService } from "@/services/ExploreService";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import type { IExploreFilters } from "@/types";

const exploreQuerySchema = z.object({
  category: z.string().optional(),
  location: z.string().optional(),
  budgetMin: z.coerce.number().int().optional(),
  budgetMax: z.coerce.number().int().optional(),
  q: z.string().optional(),
  sort: z.enum(["NEWEST", "TOP_RATED", "MOST_BOOKED", "FEATURED"]).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawParams: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      rawParams[key] = value;
    });

    const parsed = exploreQuerySchema.safeParse(rawParams);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          data: [],
          cursor: null,
          hasMore: false,
          error: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const platformConfig = await PlatformConfigService.getCached();

    let result: { data: import("@/types").IExploreCard[]; cursor: string | null; hasMore: boolean };
    try {
      result = await ExploreService.query(parsed.data as IExploreFilters);
    } catch {
      const { MockDataService } = await import("@/services/MockDataService");
      const mockData = MockDataService.getExploreProviders();
      result = { data: mockData, cursor: null, hasMore: false };
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      cursor: result.cursor,
      hasMore: result.hasMore,
      error: null,
      platformConfig: {
        feeRate: platformConfig.feeRate,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        data: [],
        cursor: null,
        hasMore: false,
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
