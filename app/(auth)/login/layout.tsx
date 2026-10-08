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
    title: "Sign In",
    description: `Sign in to your ${config.name} account to manage bookings, message creators, and track escrow payments.`,
    path: "/login",
    noindex: true,
  });
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
