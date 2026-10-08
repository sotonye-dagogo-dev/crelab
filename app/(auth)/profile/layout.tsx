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
    title: "Your Profile",
    description: `Manage your ${config.name} account details, display name, and email settings.`,
    path: "/profile",
    noindex: true,
  });
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
