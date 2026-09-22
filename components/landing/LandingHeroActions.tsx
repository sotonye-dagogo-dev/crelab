"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export function LandingHeroActions() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return (
      <div className="flex gap-3 flex-wrap max-[900px]:justify-center">
        <Link
          href="/explore"
          className="inline-flex items-center justify-center h-11 px-6 rounded-[8px] bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-semibold text-[15px] no-underline gap-2 hover:bg-[var(--color-accent-dim)] transition-colors"
        >
          Explore Creators
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center h-11 px-6 rounded-[8px] bg-transparent text-[var(--color-text-primary)] border border-[var(--color-border-mid)] font-semibold text-[15px] no-underline gap-2 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex gap-3 flex-wrap max-[900px]:justify-center">
      <Link
        href="/explore"
        className="inline-flex items-center justify-center h-11 px-6 rounded-[8px] bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-semibold text-[15px] no-underline gap-2 hover:bg-[var(--color-accent-dim)] transition-colors"
      >
        Explore Creators
      </Link>
      <Link
        href="/register"
        className="inline-flex items-center justify-center h-11 px-6 rounded-[8px] bg-transparent text-[var(--color-text-primary)] border border-[var(--color-border-mid)] font-semibold text-[15px] no-underline gap-2 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
      >
        Join as Creator
      </Link>
    </div>
  );
}
