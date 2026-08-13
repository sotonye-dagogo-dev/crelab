import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { consentRecords } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { ConsentType } from "@/types";

/**
 * Blog newsletter subscription. Stores a granted MARKETING consent record so
 * the subscription is config-driven and manageable by admins (the same pool
 * used by "Send to Subscribers" on the email templates page). Requires a
 * signed-in account; anonymous readers are redirected to sign in.
 */
export async function POST(req: NextRequest) {
  try {
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Sign in to subscribe to the newsletter." },
        { status: 401 },
      );
    }

    const body = await req.json();
    const { email } = body;
    if (!email || !String(email).includes("@")) {
      return NextResponse.json(
        { success: false, error: "A valid email is required" },
        { status: 400 },
      );
    }

    const existing = await db
      .select()
      .from(consentRecords)
      .where(
        and(
          eq(consentRecords.userId, session.user.id),
          eq(consentRecords.type, ConsentType.MARKETING),
        ),
      )
      .limit(1);

    if (existing.length === 0) {
      await db.insert(consentRecords).values({
        id: crypto.randomUUID(),
        userId: session.user.id,
        type: ConsentType.MARKETING,
        granted: true,
      });
    } else {
      await db
        .update(consentRecords)
        .set({ granted: true })
        .where(eq(consentRecords.id, existing[0].id));
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
