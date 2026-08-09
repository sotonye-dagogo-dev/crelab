import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { DashboardService } from "@/services/DashboardService";
import { MockDataService } from "@/services/MockDataService";

export const dynamic = "force-dynamic";

async function getSessionUser() {
  try {
    const session = await requireAuth();
    return session.user;
  } catch {
    if (MockDataService.isEnabled()) {
      return MockDataService.getMockSession().user;
    }
    throw new Error("Unauthorized");
  }
}

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    const role = (sessionUser.role as string | undefined) ?? "CLIENT";

    const service = new DashboardService();

    const data =
      role === "PROVIDER"
        ? await service.getProviderDashboard(sessionUser.id)
        : await service.getClientDashboard(sessionUser.id);

    return NextResponse.json({ success: true, data, error: null });
  } catch (err) {
    const message =
      err instanceof Error && err.message === "Unauthorized"
        ? "Unauthorized"
        : err instanceof Error
          ? err.message
          : "Internal server error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ success: false, data: null, error: message }, { status });
  }
}
