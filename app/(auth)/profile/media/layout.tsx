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
    title: "My Media",
    description: `Upload and manage your portfolio media library on ${config.name}.`,
    path: "/profile/media",
    noindex: true,
  });
}

export default function ProfileMediaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
