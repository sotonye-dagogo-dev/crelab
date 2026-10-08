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
    title: "Report a Bug",
    description: `Spotted something broken on ${config.name}? Send a bug report with screenshots and track the fix — our team reviews every report.`,
    path: "/bug-report",
  });
}

export default function BugReportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
