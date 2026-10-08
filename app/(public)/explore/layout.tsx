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
    title: "Explore Creators",
    description: `Browse vetted ${config.name} creators and their portfolio work. Filter by category, budget, and location — book securely with escrow protection.`,
    path: "/explore",
    keywords: ["hire creators", "content creators", "cinematographers", "creative marketplace", "book creatives", "Nigeria creators"],
  });
}

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
