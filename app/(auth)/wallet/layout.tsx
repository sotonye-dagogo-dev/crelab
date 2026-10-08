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
    title: "Wallet",
    description: `Your ${config.name} wallet — top up, track escrow balances, and withdraw earnings securely.`,
    path: "/wallet",
    noindex: true,
  });
}

export default function WalletLayout({ children }: { children: React.ReactNode }) {
  return children;
}
