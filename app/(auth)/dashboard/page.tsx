import { requireAuth } from "@/lib/auth";
import { DashboardService } from "@/services/DashboardService";
import { MockDataService } from "@/services/MockDataService";
import { DashboardClient } from "./DashboardClient";
import type { IProviderDashboard, IClientDashboard } from "@/types";

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

async function getDashboardData(
  role: string,
  userId: string,
): Promise<IProviderDashboard | IClientDashboard> {
  const service = new DashboardService();
  // An ADMIN account can also act as a creator/brand. When the admin has a
  // provider profile, show the provider (creator) dashboard; otherwise fall
  // back to the client (brand) dashboard.
  if (role === "PROVIDER" || role === "ADMIN") {
    const providerData = await service.getProviderDashboard(userId);
    if (role === "PROVIDER" || providerData.profile) {
      return providerData;
    }
  }
  return service.getClientDashboard(userId);
}

export default async function DashboardPage() {
  const sessionUser = await getSessionUser();
  const role = (sessionUser.role as string | undefined) ?? "CLIENT";
  const data = await getDashboardData(role, sessionUser.id);

  return <DashboardClient role={role} data={data} />;
}
