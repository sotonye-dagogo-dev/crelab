import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { teamMembers } from "@/drizzle/schema";
import { requireRole } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { AuditService } from "@/services/AuditService";
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

    const oldMember = {
      name: existing[0].name,
      role: existing[0].role,
      bio: existing[0].bio,
      active: existing[0].active,
    };
    await AuditService.log({
      userId: session.user.id,
      action: "team.update",
      entity: "team",
      entityId: id,
      oldValue: oldMember,
      newValue: {
        name: updateData.name ?? existing[0].name,
        role: updateData.role ?? existing[0].role,
        bio: updateData.bio ?? existing[0].bio,
        active: updateData.active ?? existing[0].active,
      },
    });

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
    const session = await requireRole("ADMIN");
    const { id } = await params;

    const existing = await db.select().from(teamMembers).where(eq(teamMembers.id, id)).limit(1);
    if (!existing.length) {
      return NextResponse.json(
        { success: false, error: "Team member not found" },
        { status: 404 },
      );
    }

    await db.delete(teamMembers).where(eq(teamMembers.id, id));

    await AuditService.log({
      userId: session.user.id,
      action: "team.delete",
      entity: "team",
      entityId: id,
      oldValue: {
        name: existing[0].name,
        role: existing[0].role,
      },
    });

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
