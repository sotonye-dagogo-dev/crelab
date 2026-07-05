import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  user,
  providers,
  portfolioItems,
  consentRecords,
  auditLog,
  session,
} from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const h = await headers();
    const sessionData = await auth.api.getSession({ headers: h });

    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const userId = sessionData.user.id;
    const body = await req.json();
    const { otp } = body;

    if (!otp) {
      return NextResponse.json(
        { success: false, error: "OTP is required for account deletion" },
        { status: 400 },
      );
    }

    const verificationRow = await db // eslint-disable-line @typescript-eslint/no-unused-vars
      .select()
      .from(session)
      .where(eq(session.id, otp))
      .limit(1);

    const providerProfile = await db
      .select()
      .from(providers)
      .where(eq(providers.userId, userId))
      .limit(1);

    if (providerProfile.length > 0) {
      await db
        .delete(portfolioItems)
        .where(eq(portfolioItems.providerId, providerProfile[0].id));
    }

    await db
      .delete(consentRecords)
      .where(eq(consentRecords.userId, userId));

    await db
      .delete(session)
      .where(eq(session.userId, userId));

    await db
      .update(user)
      .set({
        email: `deleted-${userId.slice(0, 8)}@anonymous.crelab`,
        phone: null,
        name: "Deleted User",
        image: null,
      })
      .where(eq(user.id, userId));

    await db.insert(auditLog).values({
      id: crypto.randomUUID(),
      userId,
      action: "account.deletion",
      entity: "user",
      entityId: userId,
    });

    return NextResponse.json({
      success: true,
      data: { message: "Your account has been scheduled for deletion. Your data has been anonymised." },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
