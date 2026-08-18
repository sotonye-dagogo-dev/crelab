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

    // Admin accounts can also act as creator/brand — show the provider dashboard
    // when the admin holds a provider profile.
    let data;
    if (role === "PROVIDER" || role === "ADMIN") {
      const providerData = await service.getProviderDashboard(sessionUser.id);
      if (role === "PROVIDER" || providerData.profile) {
        data = providerData;
      } else {
        data = await service.getClientDashboard(sessionUser.id);
      }
    } else {
      data = await service.getClientDashboard(sessionUser.id);
    }

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
