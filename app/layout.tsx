import type { Metadata } from "next";
import "./globals.css";
import { PlatformConfigProvider } from "@/lib/config-context";
import { ThemeProvider } from "@/lib/theme-context";
import { Providers } from "@/components/shared/Providers";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { DEFAULT_CONFIG } from "@/config/platform.config";
import type { IPlatformConfig } from "@/types";

export const metadata: Metadata = {
  title: DEFAULT_CONFIG.name,
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
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <PlatformConfigProvider config={platformConfig}>
          <ThemeProvider>
            <Providers>
              <Navbar />
              <main className="flex-1 pt-16">{children}</main>
              <Footer />
            </Providers>
          </ThemeProvider>
        </PlatformConfigProvider>
      </body>
    </html>
  );
}
