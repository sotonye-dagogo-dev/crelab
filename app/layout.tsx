import type { Metadata } from "next";
import "./globals.css";
import { PlatformConfigProvider } from "@/lib/config-context";
import { ThemeProvider } from "@/lib/theme-context";
import { Providers } from "@/components/shared/Providers";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { DEFAULT_CONFIG } from "@/config/platform.config";
import { buildSeoMetadata } from "@/lib/seo";
import { resolveAbsoluteUrl } from "@/lib/url";
import type { IPlatformConfig } from "@/types";

export async function generateMetadata(): Promise<Metadata> {
  let config: IPlatformConfig;
  try {
    config = await PlatformConfigService.getCached();
  } catch {
    config = DEFAULT_CONFIG;
  }

  return {
    ...buildSeoMetadata(config, {
      title: config.name,
      description: config.tagline,
      path: "/",
    }),
    icons: {
      icon: resolveAbsoluteUrl(config.iconPath),
      apple: resolveAbsoluteUrl(config.iconPath),
    },
  };
}

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
