import type { Metadata } from "next";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { DEFAULT_CONFIG } from "@/config/platform.config";

export async function generateMetadata(): Promise<Metadata> {
  let config;
  try {
    config = await PlatformConfigService.getCached();
  } catch {
    config = DEFAULT_CONFIG;
  }
  const { buildSeoMetadata } = await import("@/lib/seo");
  return buildSeoMetadata(config, {
    title: "Dashboard",
    description: `Your ${config.name} dashboard — bookings, earnings, portfolio performance, and availability at a glance.`,
    path: "/dashboard",
    noindex: true,
  });
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
