import type { Metadata } from "next";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { DEFAULT_CONFIG } from "@/config/platform.config";
import { resolveLeaderboardConfig } from "@/services/LeaderboardService";
import { buildSeoMetadata } from "@/lib/seo";
import { LeaderboardClient } from "./LeaderboardClient";
import type { IPlatformConfig } from "@/types";

export const dynamic = "force-dynamic";

async function getConfig(): Promise<IPlatformConfig> {
  try {
    return await PlatformConfigService.getCached();
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const config = await getConfig();
  const leaderboard = resolveLeaderboardConfig(config);
  return buildSeoMetadata(config, {
    title: leaderboard.title,
    description: leaderboard.subtitle,
    path: "/leaderboard",
  });
}

/**
 * Public leaderboard (guest browse). Flag off (`features.referralsEnabled` or
 * `leaderboard.enabled`) → renders nothing.
 */
export default async function LeaderboardPage() {
  const config = await getConfig();
  const leaderboard = resolveLeaderboardConfig(config);
  if (config.features?.referralsEnabled === false || !leaderboard.enabled) {
    return null;
  }

  return <LeaderboardClient pageSize={leaderboard.pageSize} />;
}
