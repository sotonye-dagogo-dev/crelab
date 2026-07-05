import type { Metadata } from "next";
import "./globals.css";
import { PlatformConfigProvider } from "@/lib/config-context";
import { Providers } from "@/components/shared/Providers";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { DEFAULT_CONFIG } from "@/config/platform.config";
import type { IPlatformConfig } from "@/types";

export const metadata: Metadata = {
  title: "Crelab",
  description:
    "A dark, cinematic marketplace where video is the first thing you see and quality speaks louder than follower count.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  let platformConfig: IPlatformConfig;
  try {
    platformConfig = await PlatformConfigService.getCached();
  } catch {
    platformConfig = DEFAULT_CONFIG;
  }

  return (
    <html lang="en">
      <body>
        <PlatformConfigProvider config={platformConfig}>
          <Providers>{children}</Providers>
        </PlatformConfigProvider>
      </body>
    </html>
  );
}
