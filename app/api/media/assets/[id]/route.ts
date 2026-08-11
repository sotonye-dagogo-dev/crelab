import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MediaAssetService } from "@/services/MediaAssetService";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const asset = await MediaAssetService.getById(id);
    if (!asset) {
      return NextResponse.json(
        { success: false, error: "Media asset not found" },
        { status: 404 },
      );
    }
    if (asset.ownerId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const result = await MediaAssetService.deleteAsset(id);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    if (err instanceof Error && err.message === "Media asset not found") {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
