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
    title: "Create Your Account",
    description: `Join ${config.name} as a creator or a brand. Showcase your work, get discovered, and get paid securely through escrow.`,
    path: "/register",
    keywords: ["sign up", "creator account", "hire creators", "creative marketplace"],
    noindex: true,
  });
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
