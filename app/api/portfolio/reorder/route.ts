import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { PortfolioService } from "@/services/PortfolioService";
import { db } from "@/lib/db";
import { providers } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (session.user.role !== "PROVIDER" && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Forbidden: providers only" },
        { status: 403 },
      );
    }

    const provider = await db
      .select()
      .from(providers)
      .where(eq(providers.userId, session.user.id))
      .then((rows) => rows[0]);

    if (!provider) {
      return NextResponse.json(
        { success: false, error: "Provider profile not found" },
        { status: 404 },
      );
    }

    const body = await req.json();
    const { orderedIds } = body;

    if (!Array.isArray(orderedIds)) {
      return NextResponse.json(
        { success: false, error: "orderedIds array is required" },
        { status: 400 },
      );
    }

    await PortfolioService.reorder(provider.id, orderedIds);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}