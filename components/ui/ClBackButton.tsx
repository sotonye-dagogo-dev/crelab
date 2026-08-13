"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Reusable "go back" affordance for working-process pages. Uses history.back()
 * when there is navigable history, otherwise falls back to the provided href.
 * Always renders an anchor (hydration-safe); clicks are intercepted client-side.
 */
export function ClBackButton({
  href,
  label = "Back",
  className = "",
}: {
  /** Fallback destination when there is no history to go back to */
  href: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      e.preventDefault();
      router.back();
    }
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={`inline-flex h-10 items-center gap-2 rounded-[8px] border border-[var(--color-border-mid)] bg-transparent px-4 text-[13px] font-semibold text-[var(--color-text-primary)] no-underline transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] ${className}`}
    >
      <ArrowLeft size={16} strokeWidth={2} />
      {label}
    </Link>
  );
}
