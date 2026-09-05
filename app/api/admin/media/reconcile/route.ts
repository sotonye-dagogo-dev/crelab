import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { MediaAssetService } from "@/services/MediaAssetService";
import { AuditService } from "@/services/AuditService";

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole("ADMIN");
    const body = (await req.json().catch(() => ({}))) as {
      assetId?: string;
      providerId?: string;
      target?: string;
      title?: string;
    };
    const assetId = typeof body.assetId === "string" ? body.assetId.trim() : "";
    const providerId = typeof body.providerId === "string" ? body.providerId.trim() : "";
    const target = body.target as "portfolio" | "avatar" | "cover" | undefined;
    if (!assetId || !providerId || !target || !["portfolio", "avatar", "cover"].includes(target)) {
      return NextResponse.json(
        { success: false, error: "assetId, providerId and target (portfolio|avatar|cover) are required" },
        { status: 400 },
      );
    }
    const result = await MediaAssetService.reconcileAsset(assetId, {
      providerId,
      target,
      title: typeof body.title === "string" ? body.title.trim() || undefined : undefined,
    });
    await AuditService.log({
      userId: session.user.id,
      action: "media.reconcile",
      entity: "media",
      entityId: assetId,
      newValue: { providerId, target, ...result },
    });
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    if (err instanceof Error && (err.message === "Forbidden" || err.message === "Unauthorized")) {
      const status = err.message === "Forbidden" ? 403 : 401;
      return NextResponse.json({ success: false, error: err.message }, { status });
    }
    if (err instanceof Error && (err.message === "Media asset not found" || err.message === "Provider not found")) {
      return NextResponse.json({ success: false, error: err.message }, { status: 404 });
    }
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
