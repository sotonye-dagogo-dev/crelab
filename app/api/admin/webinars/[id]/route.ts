import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { WebinarError, WebinarService } from "@/services/WebinarService";
import { AuditService } from "@/services/AuditService";
import type { EmailTemplateBlock } from "@/types";

const STATUSES = ["UPCOMING", "LIVE", "CANCELLED", "ENDED"] as const;

const patchSchema = z.object({
  slug: z.string().trim().min(1).max(200).optional(),
  title: z.string().trim().min(1).max(200).optional(),
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

function cleanBlocks(blocks: unknown[] | undefined): EmailTemplateBlock[] | undefined {
  if (!blocks) return undefined;
  return blocks.filter(
    (block): block is EmailTemplateBlock =>
      typeof block === "object" && block !== null && typeof (block as { type?: unknown }).type === "string",
  );
}

function summary(w: { title: string; slug: string; status: string; active: boolean } | null) {
  return w ? { title: w.title, slug: w.slug, status: w.status, active: w.active } : null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole("ADMIN");
    const { id } = await params;
    const json = await req.json();
    const check = patchSchema.safeParse(json);
    if (!check.success) {
      return NextResponse.json(
        { success: false, error: check.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const existing = await WebinarService.adminGet(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: "Webinar not found" }, { status: 404 });
    }

    const patch = { ...check.data, contentBlocks: cleanBlocks(check.data.contentBlocks) };
    const updated = await WebinarService.update(id, patch);
    if (!updated) {
      return NextResponse.json({ success: false, error: "Webinar not found" }, { status: 404 });
    }

    await AuditService.log({
      userId: session.user.id,
      action: "webinar.update",
      entity: "webinars",
      entityId: id,
      oldValue: summary(existing),
      newValue: summary(updated),
    });

    return NextResponse.json({ success: true, data: updated });
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

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole("ADMIN");
    const { id } = await params;
    const existing = await WebinarService.adminGet(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: "Webinar not found" }, { status: 404 });
    }

    const removed = await WebinarService.remove(id);
    if (!removed) {
      return NextResponse.json({ success: false, error: "Webinar not found" }, { status: 404 });
    }

    await AuditService.log({
      userId: session.user.id,
      action: "webinar.delete",
      entity: "webinars",
      entityId: id,
      oldValue: summary(existing),
    });

    return NextResponse.json({ success: true });
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
