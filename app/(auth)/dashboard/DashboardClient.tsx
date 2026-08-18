import { ProviderDashboard } from "./components/ProviderDashboard";
import { ClientDashboard } from "./components/ClientDashboard";
import type { IProviderDashboard, IClientDashboard } from "@/types";

interface DashboardClientProps {
  role: string;
  data: IProviderDashboard | IClientDashboard;
}

export function DashboardClient({ role, data }: DashboardClientProps) {
  // Admin accounts can also act as creator/brand — resolve the view from the
  // data the server produced rather than the raw account role.
  const effectiveRole = data.role ?? role;
  if (effectiveRole === "PROVIDER") {
    return <ProviderDashboard data={data as IProviderDashboard} />;
  }
  return <ClientDashboard data={data as IClientDashboard} />;
}
