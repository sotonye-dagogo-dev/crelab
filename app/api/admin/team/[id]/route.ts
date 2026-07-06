import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { teamMembers } from "@/drizzle/schema";
import { requireRole } from "@/lib/auth";
import { eq } from "drizzle-orm";
import type { ITeamMember } from "@/types";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole("ADMIN");
    const { id } = await params;
    const body = (await req.json()) as Partial<ITeamMember>;

    const existing = await db.select().from(teamMembers).where(eq(teamMembers.id, id)).limit(1);
    if (!existing.length) {
      return NextResponse.json(
        { success: false, error: "Team member not found" },
        { status: 404 },
      );
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };
    if (body.name !== undefined) updateData.name = body.name;
    if (body.role !== undefined) updateData.role = body.role;
    if (body.bio !== undefined) updateData.bio = body.bio;
    if (body.avatarUrl !== undefined) updateData.avatarUrl = body.avatarUrl;
    if (body.socialLinks !== undefined) updateData.socialLinks = body.socialLinks;
    if (body.orderIndex !== undefined) updateData.orderIndex = body.orderIndex;
    if (body.active !== undefined) updateData.active = body.active;

    await db.update(teamMembers).set(updateData).where(eq(teamMembers.id, id));

    return NextResponse.json({ success: true, data: { id, ...updateData } });
  } catch (err) {
    if (err instanceof Error && (err.message === "Forbidden" || err.message === "Unauthorized")) {
      const status = err.message === "Forbidden" ? 403 : 401;
      return NextResponse.json({ success: false, error: err.message }, { status });
    }
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole("ADMIN");
    const { id } = await params;

    const existing = await db.select().from(teamMembers).where(eq(teamMembers.id, id)).limit(1);
    if (!existing.length) {
      return NextResponse.json(
        { success: false, error: "Team member not found" },
        { status: 404 },
      );
    }

    await db.delete(teamMembers).where(eq(teamMembers.id, id));

    return NextResponse.json({ success: true, data: null });
  } catch (err) {
    if (err instanceof Error && (err.message === "Forbidden" || err.message === "Unauthorized")) {
      const status = err.message === "Forbidden" ? 403 : 401;
      return NextResponse.json({ success: false, error: err.message }, { status });
    }
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
