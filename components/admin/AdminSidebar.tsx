"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { usePlatformConfig } from "@/lib/config-context";

const navItems = [
  {
    label: "Config",
    href: "/admin/config",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    label: "Categories",
    href: "/admin/categories",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 4h7v7H4zM15 4h5v5h-5zM4 15h5v5H4zM15 15h5v5h-5z" />
      </svg>
    ),
  },
  {
    label: "Providers",
    href: "/admin/providers",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    label: "Disputes",
    href: "/admin/disputes",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const platformConfig = usePlatformConfig();

  return (
    <aside className="fixed top-0 left-0 w-[240px] h-screen bg-[var(--color-surface)] border-r border-[var(--color-border)] flex flex-col z-30">
      <div
        className="flex items-center gap-2 px-5 py-5 cursor-pointer"
        onClick={() => router.push("/admin/config")}
      >
        <div className="w-3 h-3 bg-[var(--color-accent)] rotate-45 flex-shrink-0" />
        <span className="font-[family-name:var(--font-display)] font-extrabold text-[18px] text-[var(--color-text-primary)]">
          {platformConfig.name}
        </span>
      </div>
      <nav className="flex-1 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`
                w-full flex items-center gap-2 px-5 py-[10px] text-[13px] font-medium
                cursor-pointer no-underline transition-colors duration-[150ms] ease-[cubic-bezier(0.16,1,0.3,1)]
                border-l-[3px] border-transparent
                ${isActive
                  ? "bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] border-l-[var(--color-accent)]"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)]"
                }
              `.trim()}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="px-5 py-4 border-t border-[var(--color-border)] flex items-center gap-3">
        <div className="w-7 h-7 rounded-full bg-[var(--color-surface-raised)] flex items-center justify-center text-[11px] font-semibold text-[var(--color-text-secondary)] flex-shrink-0">
          {user?.name?.[0]?.toUpperCase() ?? "A"}
        </div>
        <div className="flex-1">
          <div className="text-[12px] text-[var(--color-text-secondary)]">
            {user?.name ?? "Admin"}
          </div>
        </div>
        <button
          onClick={signOut}
          className="text-[11px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] cursor-pointer bg-transparent border-none"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
