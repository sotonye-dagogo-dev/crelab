import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  user,
  providers,
  portfolioItems,
  bookings,
  reviews,
  consentRecords,
  auditLog,
} from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { PlatformConfigService } from "@/services/PlatformConfigService";

export async function GET() {
  try {
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const userId = session.user.id;
    const config = await PlatformConfigService.get();

    const userData = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (userData.length === 0) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    const providerProfile = await db
      .select()
      .from(providers)
      .where(eq(providers.userId, userId))
      .limit(1);

    const portfolioItemsList = providerProfile.length > 0
      ? await db
          .select()
          .from(portfolioItems)
          .where(eq(portfolioItems.providerId, providerProfile[0].id))
      : [];

    const userBookings = await db
      .select()
      .from(bookings)
      .where(eq(bookings.clientId, userId));

    const userReviews = await db
      .select()
      .from(reviews)
      .where(eq(reviews.reviewerId, userId));

    const consentRecordsList = await db
      .select()
      .from(consentRecords)
      .where(eq(consentRecords.userId, userId));

    const exportData = {
      user: userData[0],
      providerProfile: providerProfile[0] ?? null,
      portfolioItems: portfolioItemsList,
      bookings: userBookings,
      reviews: userReviews,
      consentRecords: consentRecordsList,
      _notice: `This is your personal data held by ${config.name} under NDPR 2023. Contact ${config.name} Support for questions.`,
    };

    await db.insert(auditLog).values({
      id: crypto.randomUUID(),
      userId,
      action: "data.export",
      entity: "user",
      entityId: userId,
    });

    const body = JSON.stringify(exportData, null, 2);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${config.name.toLowerCase().replace(/\s+/g, "-")}-data-export-${userId.slice(0, 8)}.json"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
