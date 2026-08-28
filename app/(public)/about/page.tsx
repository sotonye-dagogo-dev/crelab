import { DEFAULT_CONFIG } from "@/config/platform.config";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { db } from "@/lib/db";
import { aboutPage } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import type { Metadata } from "next";
import type { IAboutPage } from "@/types";

// Static fallback data for build-time and when DB is unavailable
const FALLBACK_ABOUT_PAGE: IAboutPage = {
  id: "about-1",
  heroTitle: "About Crellab",
  heroSubtitle: "We're building the future of creative hiring in Africa — connecting brands with talented creators, cinematographers, and videographers.",
  sections: [
    {
      id: "mission",
      title: "Our Mission",
      content: "To democratize access to creative opportunities across Africa. We believe talent shouldn't be limited by geography, network, or follower count.",
    },
    {
      id: "vision",
      title: "Our Vision",
      content: "A thriving creative economy where every creator can build a sustainable career doing what they love, and every brand can find the perfect creative partner.",
    },
    {
      id: "values",
      title: "Our Values",
      content: "Creator-first • Transparency • Quality over quantity • Community-driven • Built for Africa",
    },
  ],
  quickLinks: [
    { label: "How It Works", href: "/how-it-works" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Report a Bug", href: "/bug-report" },
    { label: "Contact Us", href: "#contact" },
  ],
  metaTitle: "About Crellab - Connecting African Creatives with Opportunity",
  metaDescription: "Learn about Crellab's mission to connect brands with talented African creators, cinematographers, and videographers. Built for African creativity.",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export async function generateMetadata(): Promise<Metadata> {
  const { buildSeoMetadata } = await import("@/lib/seo");
  let config;
  try {
    config = await PlatformConfigService.getCached();
  } catch {
    config = DEFAULT_CONFIG;
  }
  return buildSeoMetadata(config, {
    title: `About ${config.name}`,
    description: `Learn about ${config.name}'s mission to connect African creatives with opportunity.`,
    path: "/about",
  });
}

export default async function AboutPage() {
  let pageData: IAboutPage | null = null;
  try {
    const result = await db
      .select()
      .from(aboutPage)
      .where(eq(aboutPage.id, "about-1"))
      .limit(1);
    if (result[0]) {
      pageData = result[0] as unknown as IAboutPage;
    }
  } catch {
    // DB unavailable, will use fallback
  }

  const data = pageData || FALLBACK_ABOUT_PAGE;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-[800px] mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center max-w-[680px] mx-auto mb-16">
          <h1 className="font-[family-name:var(--font-display)] font-extrabold text-4xl md:text-5xl tracking-[-0.02em] leading-[1.2] mb-4">
            {data.heroTitle}
          </h1>
          {data.heroSubtitle && (
            <p className="text-[var(--color-text-secondary)] text-lg leading-relaxed">
              {data.heroSubtitle}
            </p>
          )}
        </div>

        {/* Content Sections */}
        <div className="space-y-12">
          {data.sections.map((section) => (
            <section key={section.id} className="space-y-4">
              <h2 className="font-[family-name:var(--font-display)] font-bold text-[22px] text-[var(--color-text-primary)]">
                {section.title}
              </h2>
              <div className="text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
                {section.content}
              </div>
            </section>
          ))}

          {/* Quick Links */}
          <section className="pt-8 border-t border-[var(--color-border)]">
            <h2 className="font-[family-name:var(--font-display)] font-bold text-[22px] text-[var(--color-text-primary)] mb-6">
              Quick Links
            </h2>
            <div className="flex flex-wrap gap-3">
              {data.quickLinks.map((link, i) => (
                <a
                  key={i}
                  href={link.href}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] text-sm font-medium no-underline hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] hover:bg-[var(--color-surface-raised)] transition-colors duration-200"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </section>
        </div>

        {/* Footer CTA */}
        <div className="mt-16 pt-8 border-t border-[var(--color-border)] text-center">
          <h2 className="font-[family-name:var(--font-display)] font-bold text-2xl mb-2">
            Ready to get started?
          </h2>
          <p className="text-[var(--color-text-secondary)] mb-6 max-w-[480px] mx-auto">
            Join thousands of creators and brands already using Crellab to build amazing
            things together.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/explore"
              className="inline-flex items-center justify-center h-10 px-6 rounded-md bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-semibold text-sm no-underline hover:bg-[var(--color-accent-dim)] transition-colors"
            >
              Explore Creators
            </Link>
            <Link
              href="/profile/setup"
              className="inline-flex items-center justify-center h-10 px-6 rounded-md border border-[var(--color-border)] bg-transparent text-[var(--color-text-primary)] font-semibold text-sm no-underline hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
            >
              Create a Creator Profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}