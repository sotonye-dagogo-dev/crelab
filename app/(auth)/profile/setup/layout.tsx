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
    title: "Set Up Your Creator Profile",
    description: `Create your ${config.name} creator profile: pick a category, set packages, upload portfolio work, and publish.`,
    path: "/profile/setup",
    noindex: true,
  });
}

export default function ProfileSetupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
