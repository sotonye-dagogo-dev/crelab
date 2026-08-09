import { ProviderDashboard } from "./components/ProviderDashboard";
import { ClientDashboard } from "./components/ClientDashboard";
import type { IProviderDashboard, IClientDashboard } from "@/types";

interface DashboardClientProps {
  role: string;
  data: IProviderDashboard | IClientDashboard;
}

export function DashboardClient({ role, data }: DashboardClientProps) {
  if (role === "PROVIDER") {
    return <ProviderDashboard data={data as IProviderDashboard} />;
  }
  return <ClientDashboard data={data as IClientDashboard} />;
}
