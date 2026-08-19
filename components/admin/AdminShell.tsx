"use client";

import { useEffect, useState } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { Menu } from "lucide-react";
import { ClLogo } from "@/components/ui";

const COLLAPSED_KEY = "admin-sidebar-collapsed";

/**
 * Admin shell: owns the sidebar collapse state (persisted to localStorage) and
 * the responsive behaviour. On lg+ the sidebar is a fixed, collapsible rail
 * (240px ↔ 72px icon-only). Below lg it becomes a slide-in drawer toggled from
 * a mobile top bar, so admin views stay usable on small screens.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(COLLAPSED_KEY);
      if (saved !== null) setCollapsed(saved === "1");
    } catch {
      // localStorage unavailable — fall back to the expanded default
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        // ignore persistence failures
      }
      return next;
    });
  };

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)] lg:-mt-16">
      <AdminSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggle={toggleCollapsed}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center gap-3 h-14 px-4 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
        <button
          onClick={() => setMobileOpen(true)}
          className="inline-flex items-center justify-center w-9 h-9 rounded-[8px] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)] cursor-pointer border-none"
          aria-label="Open menu"
        >
          <Menu size={20} strokeWidth={1.8} />
        </button>
        <ClLogo variant="icon" showName iconWidth={22} iconHeight={22} />
      </div>

      <main className="flex-1 min-w-0 pt-14 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}