import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { teamMembers } from "@/drizzle/schema";
import { requireRole } from "@/lib/auth";
import { asc, eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import type { ITeamMember } from "@/types";

export async function GET() {
  try {
    await requireRole("ADMIN");
    const rows = await db
      .select()
      .from(teamMembers)
      .orderBy(asc(teamMembers.orderIndex), asc(teamMembers.createdAt));
    return NextResponse.json({ success: true, data: rows });
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

export async function POST(req: NextRequest) {
  try {
    await requireRole("ADMIN");
    const body = (await req.json()) as Partial<ITeamMember>;

    if (!body.name || !body.role) {
      return NextResponse.json(
        { success: false, error: "Name and role are required" },
        { status: 400 },
      );
    }

    const newMember = {
      id: uuid(),
      name: body.name,
      role: body.role,
      bio: body.bio ?? "",
      avatarUrl: body.avatarUrl ?? null,
      socialLinks: body.socialLinks ?? [],
      orderIndex: body.orderIndex ?? 0,
      active: body.active ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(teamMembers).values(newMember);

    return NextResponse.json({ success: true, data: newMember }, { status: 201 });
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
