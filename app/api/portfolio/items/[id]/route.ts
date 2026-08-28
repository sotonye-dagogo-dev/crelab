import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { PortfolioService } from "@/services/PortfolioService";
import { db } from "@/lib/db";
import { providers, portfolioItems } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    const body = await req.json();
    const { visible } = body;

    if (typeof visible !== "boolean") {
      return NextResponse.json(
        { success: false, error: "visible must be a boolean" },
        { status: 400 },
      );
    }

    // Verify ownership
    const item = await db
      .select()
      .from(portfolioItems)
      .where(and(eq(portfolioItems.id, id), eq(portfolioItems.providerId, provider.id)))
      .then((rows) => rows[0]);

    if (!item) {
      return NextResponse.json(
        { success: false, error: "Portfolio item not found" },
        { status: 404 },
      );
    }

    await PortfolioService.setHidden(id, visible);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;

    // Verify ownership
    const item = await db
      .select()
      .from(portfolioItems)
      .where(and(eq(portfolioItems.id, id), eq(portfolioItems.providerId, provider.id)))
      .then((rows) => rows[0]);

    if (!item) {
      return NextResponse.json(
        { success: false, error: "Portfolio item not found" },
        { status: 404 },
      );
    }

    await PortfolioService.deleteItem(id);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}