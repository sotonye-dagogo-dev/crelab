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
    title: "Forgot Password",
    description: `Reset your ${config.name} password. We'll email you a secure reset link.`,
    path: "/forgot-password",
    noindex: true,
  });
}

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
