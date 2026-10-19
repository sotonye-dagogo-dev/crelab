import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { MilestoneService } from "@/services/MilestoneService";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const { action, milestoneId, bookingId, milestones, deliveryNote, reason } = body;

    const milestoneService = new MilestoneService();

    switch (action) {
      case "create": {
        if (!bookingId || !milestones) {
          return NextResponse.json(
            { success: false, error: "bookingId and milestones are required" },
            { status: 400 },
          );
        }
        const result = await milestoneService.createMilestones(bookingId, milestones, session.user.id);
        return NextResponse.json({ success: true, data: result });
      }

      case "fund": {
        if (!milestoneId) {
          return NextResponse.json(
            { success: false, error: "milestoneId is required" },
            { status: 400 },
          );
        }
        const result = await milestoneService.fundMilestone(milestoneId, session.user.id);
        return NextResponse.json({ success: true, data: result });
      }

      case "submit": {
        if (!milestoneId) {
          return NextResponse.json(
            { success: false, error: "milestoneId is required" },
            { status: 400 },
          );
        }
        const result = await milestoneService.submitMilestone(milestoneId, session.user.id, deliveryNote);
        return NextResponse.json({ success: true, data: result });
      }

      case "approve": {
        if (!milestoneId) {
          return NextResponse.json(
            { success: false, error: "milestoneId is required" },
            { status: 400 },
          );
        }
        const result = await milestoneService.approveMilestone(milestoneId, session.user.id);
        return NextResponse.json({ success: true, data: result });
      }

      case "dispute": {
        if (!milestoneId || !reason) {
          return NextResponse.json(
            { success: false, error: "milestoneId and reason are required" },
            { status: 400 },
          );
        }
        const result = await milestoneService.disputeMilestone(milestoneId, session.user.id, reason);
        return NextResponse.json({ success: true, data: result });
      }

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 },
        );
    }
  } catch (err) {
    if (err instanceof Error && err.message === "Forbidden") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get("bookingId");

    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: "bookingId is required" },
        { status: 400 },
      );
    }

    const milestoneService = new MilestoneService();
    const milestones = await milestoneService.getMilestonesByBooking(bookingId);

    return NextResponse.json({ success: true, data: milestones });
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
