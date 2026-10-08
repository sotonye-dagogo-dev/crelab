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
    title: "My Bookings",
    description: `Track your ${config.name} bookings from request to escrow release — milestones, messages, and delivery in one place.`,
    path: "/bookings",
    noindex: true,
  });
}

export default function BookingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
