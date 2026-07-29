"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePlatformConfig } from "@/lib/config-context";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { ClLogo } from "@/components/ui";
import { ThemeToggler } from "./ThemeToggler";

const navLinks = [
  { href: "/", label: "Explore" },
  { href: "/blog", label: "Blog" },
  { href: "/team", label: "Team" },
];

export function Navbar() {
  const pathname = usePathname();
  const { features } = usePlatformConfig();
  const { isAuthenticated } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = pathname.startsWith("/admin");
  const visibleLinks = navLinks.filter(
    (l) => l.href !== "/blog" || features?.blogEnabled !== false,
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

        {/* Desktop nav */}
        <nav className="hidden sm:block">
          <ul className="flex list-none items-center gap-6">
            {visibleLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`text-sm font-medium no-underline transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    pathname === link.href
                      ? "text-[var(--color-text-primary)]"
                      : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  }`}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Desktop actions */}
        <div className="hidden sm:flex items-center gap-3">
          {isAuthenticated ? (
            <Link
              href="/profile"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-transparent bg-[var(--color-accent)] px-4 text-sm font-semibold text-[var(--color-text-inverse)] no-underline transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[var(--color-accent-dim)]">
              Profile
            </Link>
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

      {/* Mobile full-screen overlay */}
      <div
        className={`fixed inset-0 z-[60] flex flex-col items-center justify-center gap-8 bg-[var(--color-bg)] transition-opacity duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          mobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}>
        <div className="absolute top-6 left-6 flex items-center gap-3">
          <ClLogo variant="icon" showName iconWidth={32} iconHeight={32} />
        </div>

        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-6 right-6 flex h-11 w-11 items-center justify-center rounded-[8px] border border-[var(--color-border)] bg-transparent text-[var(--color-text-primary)] text-2xl cursor-pointer"
          aria-label="Close">
          ✕
        </button>

        {visibleLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`font-[family-name:var(--font-display)] text-[1.5rem] font-bold no-underline transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              pathname === link.href
                ? "text-[var(--color-accent)]"
                : "text-[var(--color-text-primary)] hover:text-[var(--color-text-secondary)]"
            }`}>
            {link.label}
          </Link>
        ))}

        {isAuthenticated ? (
          <Link
            href="/profile"
            className="inline-flex h-12 w-[200px] items-center justify-center gap-2 rounded-[8px] border border-transparent bg-[var(--color-accent)] px-6 text-sm font-semibold text-[var(--color-text-inverse)] no-underline transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[var(--color-accent-dim)]">
            Profile
          </Link>
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
    </header>
  );
}
