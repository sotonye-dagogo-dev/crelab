import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { user } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { isSelfAssignableRole } from "@/lib/oauth";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { role } = await req.json();

    if (!isSelfAssignableRole(role)) {
      return NextResponse.json(
        { success: false, error: "Role must be one of: CLIENT, PROVIDER" },
        { status: 400 },
      );
    }

    await db
      .update(user)
      .set({ role, updatedAt: new Date() })
      .where(eq(user.id, session.user.id));

    return NextResponse.json({ success: true, role });
  } catch (err) {
    console.error("[POST /api/auth/role] Error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
