import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

const ROLES = ["CLIENT", "PROVIDER", "ADMIN"] as const;

/** ADMIN-only. Updates a user's role and/or email verification state. */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireRole("ADMIN");
    const { id } = await params;

    const body = await req.json();
    const update: Record<string, unknown> = {};

    if (body.role !== undefined) {
      if (!ROLES.includes(body.role)) {
        return NextResponse.json(
          { success: false, error: "Role must be one of CLIENT, PROVIDER, or ADMIN" },
          { status: 400 },
        );
      }
      update.role = body.role;
    }

    if (body.emailVerified !== undefined) {
      if (typeof body.emailVerified !== "boolean") {
        return NextResponse.json(
          { success: false, error: "emailVerified must be a boolean" },
          { status: 400 },
        );
      }
      update.emailVerified = body.emailVerified;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { success: false, error: "Nothing to update" },
        { status: 400 },
      );
    }

    const [updated] = await db.update(user).set(update).where(eq(user.id, id)).returning({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      role: user.role,
    });

    if (!updated) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        emailVerified: updated.emailVerified,
        role: updated.role,
      },
    });
  } catch (err) {
    if (err instanceof Error && (err.message === "Forbidden" || err.message === "Unauthorized")) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.message === "Forbidden" ? 403 : 401 });
    }
    console.error("[PATCH /api/admin/users/:id] Error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

/** ADMIN-only. Deletes a user. Admins cannot delete their own account here. */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await requireRole("ADMIN");
    const { id } = await params;

    if (id === session.user.id) {
      return NextResponse.json(
        { success: false, error: "You cannot delete your own account from here" },
        { status: 400 },
      );
    }

    const deleted = await db.delete(user).where(eq(user.id, id)).returning({ id: user.id });

    if (deleted.length === 0) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { id } });
  } catch (err) {
    if (err instanceof Error && (err.message === "Forbidden" || err.message === "Unauthorized")) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.message === "Forbidden" ? 403 : 401 });
    }
    console.error("[DELETE /api/admin/users/:id] Error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}