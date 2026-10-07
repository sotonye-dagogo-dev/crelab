import type { Metadata } from "next";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { DEFAULT_CONFIG } from "@/config/platform.config";
import { buildSeoMetadata } from "@/lib/seo";
import { resolveWebinarsConfig } from "@/lib/webinars";
import { WebinarsClient } from "./WebinarsClient";

export const dynamic = "force-dynamic";

async function getConfig() {
  try {
    return await PlatformConfigService.getCached();
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const config = await getConfig();
  const webinars = resolveWebinarsConfig(config.webinars);
  return buildSeoMetadata(config, {
    title: webinars.heroTitle,
    description: webinars.heroSubtitle,
    path: "/webinars",
  });
}

/**
 * Public webinars landing (guest browse). Flag off (`features.webinarsEnabled
 * === false`) → renders nothing; registration is additionally refused by the
 * register endpoint itself.
 */
export default async function WebinarsPage() {
  const config = await getConfig();
  if (config.features?.webinarsEnabled === false) {
    return null;
  }
  return <WebinarsClient />;
}
