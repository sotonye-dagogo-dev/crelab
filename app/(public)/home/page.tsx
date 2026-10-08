import type { Metadata } from "next";
import { LandingContent } from "@/components/landing/LandingContent";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { PlatformStatsService, type IPlatformStats } from "@/services/PlatformStatsService";
import { DEFAULT_CONFIG } from "@/config/platform.config";
import { buildSeoMetadata } from "@/lib/seo";

// Landing stats + config resolve live — never serve a stale prerender.
export const dynamic = "force-dynamic";

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
      "Discover vetted creators, book securely with escrow, and bring your vision to life. Browse portfolios, book packages, and pay safely on " +
      config.name +
      ".",
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

  let stats: IPlatformStats | null = null;
  try {
    stats = await PlatformStatsService.getCached();
  } catch {
    stats = null;
  }

  return <LandingContent config={config} stats={stats} />;
}
