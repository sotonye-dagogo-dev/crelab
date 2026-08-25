import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { BookingService } from "@/services/BookingService";

export async function POST(req: Request) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const { providerId, packageId, serviceDate, scopeNotes } = body;

    if (!providerId || !packageId || !serviceDate) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    const bookingService = new BookingService();
    const booking = await bookingService.createRequest({
      providerId,
      clientId: session.user.id,
      packageId,
      serviceDate,
      scopeNotes,
    });

    return NextResponse.json({ success: true, data: booking });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
    if (err instanceof Error && err.message.includes("not found")) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: 404 },
      );
    }
    if (err instanceof Error && err.message.includes("must be in the future")) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: 400 },
      );
    }
    if (err instanceof Error && err.message.includes("not active")) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}