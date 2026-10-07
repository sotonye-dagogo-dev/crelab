import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { WebinarError, WebinarService } from "@/services/WebinarService";
import { AuditService } from "@/services/AuditService";
import type { EmailTemplateBlock } from "@/types";

const STATUSES = ["UPCOMING", "LIVE", "CANCELLED", "ENDED"] as const;

const createSchema = z.object({
  slug: z.string().trim().min(1).max(200),
  title: z.string().trim().min(1).max(200),
  subtitle: z.string().trim().max(300).nullish(),
  description: z.string().trim().max(5000).nullish(),
  coverUrl: z.string().trim().max(2000).nullish(),
  status: z.enum(STATUSES).optional(),
  startsAt: z.string().max(64).nullish(),
  endsAt: z.string().max(64).nullish(),
  durationMinutes: z.number().int().positive().max(24 * 60).nullish(),
  locationNote: z.string().trim().max(300).nullish(),
  ctaLabel: z.string().trim().max(120).nullish(),
  ctaHref: z.string().trim().max(2000).nullish(),
  recordingUrl: z.string().trim().max(2000).nullish(),
  contentBlocks: z.array(z.unknown()).optional(),
  metaTitle: z.string().trim().max(200).nullish(),
  metaDescription: z.string().trim().max(320).nullish(),
  orderIndex: z.number().int().min(0).max(10000).optional(),
  active: z.boolean().optional(),
});

/** Blocks come from the visual editor — keep only rows that look like blocks. */
function cleanBlocks(blocks: unknown[] | undefined): EmailTemplateBlock[] | undefined {
  if (!blocks) return undefined;
  return blocks.filter(
    (block): block is EmailTemplateBlock =>
      typeof block === "object" && block !== null && typeof (block as { type?: unknown }).type === "string",
  );
}

export async function GET() {
  try {
    await requireRole("ADMIN");
    const webinars = await WebinarService.adminList();
    return NextResponse.json({ success: true, data: webinars });
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
    const session = await requireRole("ADMIN");
    const json = await req.json();
    const check = createSchema.safeParse(json);
    if (!check.success) {
      return NextResponse.json(
        { success: false, error: check.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const input = { ...check.data, contentBlocks: cleanBlocks(check.data.contentBlocks) };
    const webinar = await WebinarService.create(input);

    await AuditService.log({
      userId: session.user.id,
      action: "webinar.create",
      entity: "webinars",
      entityId: webinar.id,
      newValue: { title: webinar.title, slug: webinar.slug, status: webinar.status, active: webinar.active },
    });

    return NextResponse.json({ success: true, data: webinar }, { status: 201 });
  } catch (err) {
    if (err instanceof WebinarError) {
      const status = err.code === "slug_taken" ? 409 : 400;
      return NextResponse.json({ success: false, error: err.message, code: err.code }, { status });
    }
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
