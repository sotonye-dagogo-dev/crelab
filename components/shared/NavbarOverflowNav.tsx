"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { fitCountForWidth, type NavLinkItem } from "@/lib/nav-overflow";

interface NavbarOverflowNavProps {
  links: NavLinkItem[];
  pathname: string;
  maxVisible: number;
  moreLabel: string;
}

function linkClass(active: boolean) {
  return `text-sm font-medium no-underline whitespace-nowrap transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] ${
    active
      ? "text-[var(--color-text-primary)]"
      : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
  }`;
}

/**
 * Desktop navbar links with dynamic overflow. Measures its own container with
 * ResizeObserver and spills excess links into a "More ▾" dropdown — so the
 * bar never wraps or clips as links are added. Falls back to a static
 * first-N partition before measurement (SSR-safe).
 */
export function NavbarOverflowNav({
  links,
  pathname,
  maxVisible,
  moreLabel,
}: NavbarOverflowNavProps) {
  const containerRef = useRef<HTMLUListElement>(null);
  const sizerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [fitCount, setFitCount] = useState<number>(maxVisible);
  const [moreOpen, setMoreOpen] = useState(false);

  // Keep the static cap in sync when config changes.
  useEffect(() => {
    setFitCount((prev) => Math.min(prev, maxVisible));
  }, [maxVisible]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const sizer = sizerRef.current;
    if (!container || !sizer || typeof ResizeObserver === "undefined") return;

    const measure = () => {
      const available = container.parentElement?.clientWidth ?? 0;
      if (available <= 0) return;
      const sizerLinks = Array.from(
        sizer.querySelectorAll<HTMLElement>("[data-nav-sizer-link]"),
      );
      const widths = sizerLinks.map((el) => el.offsetWidth + 24); // + gap-6
      const trigger = sizer.querySelector<HTMLElement>("[data-nav-sizer-more]");
      const triggerWidth = trigger ? trigger.offsetWidth + 24 : 96;
      const fitted = fitCountForWidth(widths, available, triggerWidth, maxVisible);
      setFitCount(fitted);
    };

    measure();
    const ro = new ResizeObserver(measure);
    if (container.parentElement) ro.observe(container.parentElement);
    ro.observe(container);
    return () => ro.disconnect();
  }, [links.length, maxVisible]);

  // Close the dropdown on route change, Escape, or outside click.
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMoreOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onPointer = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (
        t &&
        !menuRef.current?.contains(t) &&
        !triggerRef.current?.contains(t)
      ) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [moreOpen]);

  const loneStraggler = links.length === fitCount + 1;
  const inlineLinks = loneStraggler ? links : links.slice(0, fitCount);
  // Mirror the no-lone-straggler rule: a single leftover stays inline.
  const overflow = loneStraggler ? [] : links.slice(fitCount);
  const overflowActive = overflow.some((l) => l.href === pathname);

  return (
    <>
      {/* Hidden measurer: renders every link off-screen to learn true widths. */}
      <div
        ref={sizerRef}
        aria-hidden="true"
        className="pointer-events-none absolute -left-[9999px] top-0 flex items-center gap-6 opacity-0"
      >
        {links.map((l) => (
          <span key={l.href} data-nav-sizer-link className="text-sm font-medium whitespace-nowrap">
            {l.label}
          </span>
        ))}
        <span data-nav-sizer-more className="text-sm font-medium whitespace-nowrap">
          {moreLabel} ▾
        </span>
      </div>

      <ul ref={containerRef} className="flex list-none items-center gap-6">
        {inlineLinks.map((link) => (
          <li key={link.href} className="shrink-0">
            <Link href={link.href} className={linkClass(pathname === link.href)}>
              {link.label}
            </Link>
          </li>
        ))}
        {overflow.length > 0 && (
          <li className="relative shrink-0">
            <button
              ref={triggerRef}
              type="button"
              aria-haspopup="menu"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((v) => !v)}
              className={`inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-sm font-medium transition-colors duration-150 ${
                overflowActive
                  ? "text-[var(--color-text-primary)]"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {moreLabel}
              <ChevronDown
                size={14}
                strokeWidth={2.5}
                aria-hidden="true"
                className={`transition-transform duration-150 ${moreOpen ? "rotate-180" : ""}`}
              />
            </button>
            {moreOpen && (
              <div
                ref={menuRef}
                role="menu"
                aria-label={`${moreLabel} links`}
                className="absolute right-0 top-[calc(100%+8px)] min-w-[180px] rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
              >
                {overflow.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    role="menuitem"
                    onClick={() => setMoreOpen(false)}
                    className={`block rounded-[8px] px-3 py-2 text-sm font-medium no-underline transition-colors duration-150 ${
                      pathname === link.href
                        ? "bg-[var(--color-accent-muted)] text-[var(--color-text-primary)]"
                        : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text-primary)]"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </li>
        )}
      </ul>
    </>
  );
}
