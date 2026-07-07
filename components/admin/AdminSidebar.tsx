"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { usePlatformConfig } from "@/lib/config-context";
import { Settings, Grid3X3, UserCheck, AlertTriangle, Users, Bug } from "lucide-react";

const navItems = [
  {
    label: "Config",
    href: "/admin/config",
    icon: <Settings size={16} strokeWidth={1.5} />,
  },
  {
    label: "Categories",
    href: "/admin/categories",
    icon: <Grid3X3 size={16} strokeWidth={1.5} />,
  },
  {
    label: "Providers",
    href: "/admin/providers",
    icon: <UserCheck size={16} strokeWidth={1.5} />,
  },
  {
    label: "Disputes",
    href: "/admin/disputes",
    icon: <AlertTriangle size={16} strokeWidth={1.5} />,
  },
  {
    label: "Team",
    href: "/admin/team",
    icon: <Users size={16} strokeWidth={1.5} />,
  },
  {
    label: "Bug Reports",
    href: "/admin/bug-reports",
    icon: <Bug size={16} strokeWidth={1.5} />,
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
