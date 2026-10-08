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
    title: "Payment Status",
    description: `Check the status of your ${config.name} wallet payment.`,
    path: "/wallet/payment-status",
    noindex: true,
  });
}

export default function PaymentStatusLayout({ children }: { children: React.ReactNode }) {
  return children;
}
