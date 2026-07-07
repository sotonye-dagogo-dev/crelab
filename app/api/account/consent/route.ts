import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { consentRecords } from "@/drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { ConsentType } from "@/types";

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

    const records = await db
      .select()
      .from(consentRecords)
      .where(eq(consentRecords.userId, session.user.id))
      .orderBy(desc(consentRecords.createdAt));

    return NextResponse.json({
      success: true,
      data: records.map((r) => ({
        id: r.id,
        userId: r.userId,
        type: r.type,
        granted: r.granted,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const { type, granted } = body;

    if (!type || !Object.values(ConsentType).includes(type)) {
      return NextResponse.json(
        { success: false, error: "Valid consent type is required (TERMS, MARKETING, or ANALYTICS)" },
        { status: 400 },
      );
    }

    if (typeof granted !== "boolean") {
      return NextResponse.json(
        { success: false, error: "Granted must be a boolean" },
        { status: 400 },
      );
    }

    const [record] = await db
      .insert(consentRecords)
      .values({
        id: crypto.randomUUID(),
        userId: session.user.id,
        type,
        granted,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: {
        id: record.id,
        userId: record.userId,
        type: record.type,
        granted: record.granted,
        createdAt: record.createdAt.toISOString(),
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
