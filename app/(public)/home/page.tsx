import type { Metadata } from "next";
import { LandingContent } from "@/components/landing/LandingContent";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { DEFAULT_CONFIG } from "@/config/platform.config";
import { buildSeoMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  let config;
  try {
    config = await PlatformConfigService.getCached();
  } catch {
    config = DEFAULT_CONFIG;
  }
  return buildSeoMetadata(config, {
    title: `${config.name} — Home`,
    description:
      "Discover vetted creators, book securely with escrow, and bring your vision to life. Browse portfolios, book packages, and pay safely on CreLab.",
    path: "/home",
  });
}

export default async function HomeAliasPage() {
  let config;
  try {
    config = await PlatformConfigService.getCached();
  } catch {
    config = DEFAULT_CONFIG;
  }
  return <LandingContent config={config} />;
}
