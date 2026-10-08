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
    title: "Verify Your Email",
    description: `Verify your ${config.name} email address to secure your account and receive booking notifications.`,
    path: "/verify-email",
    noindex: true,
  });
}

export default function VerifyEmailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
