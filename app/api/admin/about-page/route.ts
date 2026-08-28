import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { aboutPage } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: new Headers() });
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const result = await db
      .select()
      .from(aboutPage)
      .where(eq(aboutPage.id, "about-1"))
      .limit(1);

    return NextResponse.json({ success: true, data: result[0] ?? null });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: new Headers() });
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      heroTitle,
      heroSubtitle,
      sections,
      quickLinks,
      metaTitle,
      metaDescription,
    } = body;

    if (!heroTitle || !heroTitle.trim()) {
      return NextResponse.json(
        { success: false, error: "Hero title is required" },
        { status: 400 },
      );
    }

    const existing = await db
      .select()
      .from(aboutPage)
      .where(eq(aboutPage.id, "about-1"))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(aboutPage)
        .set({
          heroTitle: heroTitle.trim(),
          heroSubtitle: heroSubtitle?.trim() ?? null,
          sections: sections ?? [],
          quickLinks: quickLinks ?? [],
          metaTitle: metaTitle?.trim() ?? null,
          metaDescription: metaDescription?.trim() ?? null,
          updatedAt: new Date(),
        })
        .where(eq(aboutPage.id, "about-1"))
        .returning();

      return NextResponse.json({ success: true, data: updated });
    } else {
      const [created] = await db
        .insert(aboutPage)
        .values({
          id: "about-1",
          heroTitle: heroTitle.trim(),
          heroSubtitle: heroSubtitle?.trim() ?? null,
          sections: sections ?? [],
          quickLinks: quickLinks ?? [],
          metaTitle: metaTitle?.trim() ?? null,
          metaDescription: metaDescription?.trim() ?? null,
        })
        .returning();

      return NextResponse.json({ success: true, data: created });
    }
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}