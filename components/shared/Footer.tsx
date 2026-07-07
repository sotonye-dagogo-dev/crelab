import Link from "next/link";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { DEFAULT_CONFIG } from "@/config/platform.config";
import { FooterClient } from "./FooterClient";

export async function Footer() {
  let config;
  try {
    config = await PlatformConfigService.getCached();
  } catch {
    config = DEFAULT_CONFIG;
  }

  const devCredit = config.devCredit ?? DEFAULT_CONFIG.devCredit ?? {
    text: "Powered by creativity",
    url: "#",
  };

  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto max-w-[1200px] px-6 pb-6 pt-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h4 className="mb-3 font-[family-name:var(--font-display)] text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
              {config.name}
            </h4>
            <p className="text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
              {config.tagline}
            </p>
          </div>
          <div>
            <h4 className="mb-3 font-[family-name:var(--font-display)] text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
              Platform
            </h4>
            <Link
              href="/"
              className="block py-1 text-[13px] text-[var(--color-text-secondary)] no-underline transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-[var(--color-text-primary)]"
            >
              Explore
            </Link>
            <Link
              href="/blog"
              className="block py-1 text-[13px] text-[var(--color-text-secondary)] no-underline transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-[var(--color-text-primary)]"
            >
              Blog
            </Link>
          </div>
          <div>
            <h4 className="mb-3 font-[family-name:var(--font-display)] text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
              Company
            </h4>
            <Link
              href="/team"
              className="block py-1 text-[13px] text-[var(--color-text-secondary)] no-underline transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-[var(--color-text-primary)]"
            >
              Team
            </Link>
            <Link
              href="/privacy"
              className="block py-1 text-[13px] text-[var(--color-text-secondary)] no-underline transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-[var(--color-text-primary)]"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="block py-1 text-[13px] text-[var(--color-text-secondary)] no-underline transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-[var(--color-text-primary)]"
            >
              Terms
            </Link>
          </div>
          <div>
            <h4 className="mb-3 font-[family-name:var(--font-display)] text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
              Legal
            </h4>
            <Link
              href="/privacy"
              className="block py-1 text-[13px] text-[var(--color-text-secondary)] no-underline transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-[var(--color-text-primary)]"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="block py-1 text-[13px] text-[var(--color-text-secondary)] no-underline transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-[var(--color-text-primary)]"
            >
              Terms of Service
            </Link>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-[var(--color-border)] pt-4 text-[12px] text-[var(--color-text-tertiary)]">
          <span>&copy; {new Date().getFullYear()} {config.name}. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <FooterClient />
            <a
              href={devCredit.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-accent)] no-underline hover:underline"
            >
              {devCredit.text}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
