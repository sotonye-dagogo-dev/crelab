"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePlatformConfig } from "@/lib/config-context";
import { useAuth } from "@/hooks/useAuth";
const navLinks = [
  { href: "/", label: "Explore" },
  { href: "/blog", label: "Blog" },
  { href: "/team", label: "Team" },
];

export function Navbar() {
  const pathname = usePathname();
  const { name } = usePlatformConfig();
  const { isAuthenticated } = useAuth();

  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) return null;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-[var(--color-border)] bg-[var(--color-surface)] bg-clip-padding backdrop-blur-xl">
      <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-[10px] font-[family-name:var(--font-display)] text-[1.25rem] font-extrabold text-[var(--color-text-primary)] no-underline"
        >
          <span className="block h-3 w-3 rotate-45 bg-[var(--color-accent)]" />
          {name}
        </Link>

        <nav>
          <ul className="flex list-none items-center gap-6">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`text-sm font-medium no-underline transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    pathname === link.href
                      ? "text-[var(--color-text-primary)]"
                      : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link
              href="/profile"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-transparent bg-[var(--color-accent)] px-4 text-sm font-semibold text-[var(--color-text-inverse)] no-underline transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[var(--color-accent-dim)]"
            >
              Profile
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[var(--color-border-mid)] bg-transparent px-4 text-sm font-semibold text-[var(--color-text-primary)] no-underline transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-transparent bg-[var(--color-accent)] px-4 text-sm font-semibold text-[var(--color-text-inverse)] no-underline transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[var(--color-accent-dim)]"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
