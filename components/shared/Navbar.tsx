"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { usePlatformConfig } from "@/lib/config-context";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { ClLogo } from "@/components/ui";
import { ThemeToggler } from "./ThemeToggler";
import { NavbarOverflowNav } from "./NavbarOverflowNav";
import {
  BASE_NAV_LINKS,
  WALLET_NAV_LINK,
  resolveNavLinks,
} from "@/lib/nav-overflow";

export function Navbar() {
  const pathname = usePathname();
  const config = usePlatformConfig();
  const { features, navigation, wallet } = config;
  const { user, isAuthenticated } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = pathname.startsWith("/admin");
  const isUserAdmin = user?.role === "ADMIN";

  const maxDesktopLinks = navigation?.maxDesktopLinks ?? 5;
  const moreLabel = navigation?.moreLabel?.trim() || "More";
  const showWalletInNav = navigation?.showWalletInNav !== false;
  const walletLabel = navigation?.walletLabel?.trim() || WALLET_NAV_LINK.label;
  const walletHref = navigation?.walletHref?.trim() || WALLET_NAV_LINK.href;

  const visibleLinks = useMemo(
    () =>
      resolveNavLinks(
        showWalletInNav
          ? [...BASE_NAV_LINKS, { ...WALLET_NAV_LINK, label: walletLabel, href: walletHref }]
          : BASE_NAV_LINKS,
        {
          blogEnabled: features?.blogEnabled !== false,
          referralsEnabled: features?.referralsEnabled !== false,
          webinarsEnabled: features?.webinarsEnabled !== false,
          walletEnabled: wallet?.enabled !== false,
          isAuthenticated,
        },
      ),
    [
      showWalletInNav,
      walletLabel,
      walletHref,
      features?.blogEnabled,
      features?.referralsEnabled,
      features?.webinarsEnabled,
      wallet?.enabled,
      isAuthenticated,
    ],
  );

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleEsc);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEsc);
    };
  }, [mobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (isAdmin) return null;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-[var(--color-border)] bg-[var(--color-bg)] bg-clip-padding backdrop-blur-xl">
      <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-[10px] no-underline">
          <ClLogo variant="icon" logoWidth={120} logoHeight={32} priority />
        </Link>

        {/* Desktop nav — excess links spill into a "More ▾" dropdown so the
            bar never wraps or clips as links are added. */}
        <nav className="hidden sm:block min-w-0" aria-label="Primary">
          <NavbarOverflowNav
            links={visibleLinks}
            pathname={pathname}
            maxVisible={maxDesktopLinks}
            moreLabel={moreLabel}
          />
        </nav>

        {/* Desktop actions */}
        <div className="hidden sm:flex items-center gap-3">
          {isAuthenticated ? (
            <>
              {isUserAdmin && (
                <Link
                  href="/admin/config"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-transparent px-3 text-sm font-semibold text-[var(--color-accent)] no-underline transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-[var(--color-accent-dim)]">
                  Admin
                </Link>
              )}
              <Link
                href="/profile"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[var(--color-border-mid)] bg-transparent px-4 text-sm font-semibold text-[var(--color-text-primary)] no-underline transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]">
                Profile
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-transparent bg-[var(--color-accent)] px-4 text-sm font-semibold text-[var(--color-text-inverse)] no-underline transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[var(--color-accent-dim)]">
                Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[var(--color-border-mid)] bg-transparent px-4 text-sm font-semibold text-[var(--color-text-primary)] no-underline transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]">
                Sign In
              </Link>
              <Link
                href="/register"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-transparent bg-[var(--color-accent)] px-4 text-sm font-semibold text-[var(--color-text-inverse)] no-underline transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[var(--color-accent-dim)]">
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(true)}
          className="sm:hidden flex h-9 w-9 items-center justify-center rounded-[8px] border border-[var(--color-border)] bg-transparent text-[var(--color-text-secondary)] cursor-pointer"
          aria-label="Menu">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect y="3" width="18" height="2" rx="1" fill="currentColor" />
            <rect y="8" width="18" height="2" rx="1" fill="currentColor" />
            <rect y="13" width="18" height="2" rx="1" fill="currentColor" />
          </svg>
        </button>
      </div>

      {/* Mobile full-screen overlay — scrollable so a long link list + auth
          CTAs never clip on short screens. Outer locks scroll position while
          open (body overflow hidden); inner region scrolls instead. */}
      <div
        className={`fixed inset-0 z-[60] overflow-y-auto overscroll-contain bg-[var(--color-bg)] transition-opacity duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          mobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}>
        <div className="min-h-full w-full flex flex-col items-center justify-center gap-6 sm:gap-8 px-6 py-24">
        <div className="absolute top-6 left-6 flex items-center gap-3">
          <ClLogo variant="icon" showName iconWidth={32} iconHeight={32} />
        </div>

        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-6 right-6 flex h-11 w-11 items-center justify-center rounded-[8px] border border-[var(--color-border)] bg-transparent text-[var(--color-text-primary)] text-2xl cursor-pointer"
          aria-label="Close">
          ✕
        </button>

        <nav
          aria-label="Mobile"
          className="flex w-full min-h-0 flex-col items-center gap-5 sm:gap-7 overflow-y-auto">
        {visibleLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`font-[family-name:var(--font-display)] text-[1.35rem] sm:text-[1.5rem] font-bold no-underline transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] shrink-0 ${
              pathname === link.href
                ? "text-[var(--color-accent)]"
                : "text-[var(--color-text-primary)] hover:text-[var(--color-text-secondary)]"
            }`}>
            {link.label}
          </Link>
        ))}
        </nav>

        {isAuthenticated ? (
          <>
            {isUserAdmin && (
              <Link
                href="/admin/config"
                className="font-[family-name:var(--font-display)] text-[1.25rem] font-bold no-underline transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] text-[var(--color-accent)] hover:text-[var(--color-accent-dim)]">
                Admin
              </Link>
            )}
            <Link
              href="/profile"
              className="font-[family-name:var(--font-display)] text-[1.35rem] sm:text-[1.5rem] font-bold no-underline transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] text-[var(--color-text-primary)] hover:text-[var(--color-text-secondary)] shrink-0">
              Profile
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-12 w-[200px] items-center justify-center gap-2 rounded-[8px] border border-transparent bg-[var(--color-accent)] px-6 text-sm font-semibold text-[var(--color-text-inverse)] no-underline transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[var(--color-accent-dim)]">
              Dashboard
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="inline-flex h-12 w-[200px] items-center justify-center gap-2 rounded-[8px] border border-[var(--color-border-mid)] bg-transparent px-6 text-sm font-semibold text-[var(--color-text-primary)] no-underline transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]">
              Sign In
            </Link>
            <Link
              href="/register"
              className="inline-flex h-12 w-[200px] items-center justify-center gap-2 rounded-[8px] border border-transparent bg-[var(--color-accent)] px-6 text-sm font-semibold text-[var(--color-text-inverse)] no-underline transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[var(--color-accent-dim)]">
              Get Started
            </Link>
          </>
        )}
        <ThemeToggler displayMode="icon" />
        </div>
      </div>
    </header>
  );
}
