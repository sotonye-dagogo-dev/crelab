import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { providers, servicePackages } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { ExperienceLevel } from "@/types";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const userId = session.user.id;
    const existing = await db
      .select()
      .from(providers)
      .where(eq(providers.userId, userId))
      .then((rows) => rows[0]);

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Profile already exists" },
        { status: 409 },
      );
    }

    const body = await req.json();
    const {
      categorySlug,
      categoryFields,
      packages,
      coverVideoUrl,
      avatarUrl,
      driveFolderUrl,
    } = body;

    if (!categorySlug || !packages || !Array.isArray(packages)) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    const providerId = crypto.randomUUID();
    const slug = `${session.user.name?.toLowerCase().replace(/\s+/g, "-")}-${providerId.slice(0, 8)}`;

    const fields = categoryFields as Record<string, unknown> | undefined;

    await db.insert(providers).values({
      id: providerId,
      userId,
      categorySlug,
      displayName: session.user.name ?? "Provider",
      bio: (fields?.bio as string) ?? null,
      location: (fields?.location as string) ?? null,
      yearsActive: fields?.yearsActive ? parseInt(fields.yearsActive as string) : null,
      experienceLevel: (fields?.experienceLevel as ExperienceLevel) ?? null,
      categoryFields: fields ?? null,
      coverVideoUrl: coverVideoUrl ?? null,
      avatarUrl: avatarUrl ?? null,
      driveFolderUrl: driveFolderUrl ?? null,
      active: true,
    });

    for (const pkg of packages) {
      await db.insert(servicePackages).values({
        id: crypto.randomUUID(),
        providerId,
        tier: pkg.tier,
        label: pkg.label,
        price: pkg.price,
        deliverables: pkg.deliverables,
        turnaroundDays: pkg.turnaroundDays,
      });
    }

    return NextResponse.json({
      success: true,
      data: { id: providerId, slug },
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}
