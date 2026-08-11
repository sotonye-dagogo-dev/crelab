import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MediaAssetService } from "@/services/MediaAssetService";

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const assets = await MediaAssetService.listByOwner(session.user.id);
    const referenced = await MediaAssetService.loadReferencedPublicIds();

    return NextResponse.json({
      success: true,
      data: assets.map((asset) => ({
        ...asset,
        referenced: referenced.has(asset.publicId),
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
