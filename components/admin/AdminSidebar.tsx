"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  Settings,
  Grid3X3,
  UserCheck,
  AlertTriangle,
  Users,
  Bug,
  Mail,
  FolderOpen,
  FileText,
  PenSquare,
  UserCog,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { ClLogo } from "@/components/ui";

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
    label: "Users",
    href: "/admin/users",
    icon: <UserCog size={16} strokeWidth={1.5} />,
  },
  {
    label: "Media",
    href: "/admin/media",
    icon: <FolderOpen size={16} strokeWidth={1.5} />,
  },
  {
    label: "Email Templates",
    href: "/admin/email-templates",
    icon: <Mail size={16} strokeWidth={1.5} />,
  },
  {
    label: "Blog Templates",
    href: "/admin/blog-templates",
    icon: <FileText size={16} strokeWidth={1.5} />,
  },
  {
    label: "Blog Posts",
    href: "/admin/blog-posts",
    icon: <PenSquare size={16} strokeWidth={1.5} />,
  },
  {
    label: "Bug Reports",
    href: "/admin/bug-reports",
    icon: <Bug size={16} strokeWidth={1.5} />,
  },
];

export function AdminSidebar({
  collapsed,
  mobileOpen,
  onToggle,
  onMobileClose,
}: {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggle: () => void;
  onMobileClose: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  const navigate = (href: string) => {
    router.push(href);
    onMobileClose();
  };

  const navContent = (
    <>
      <div
        className={`flex items-center gap-3 px-4 py-5 cursor-pointer ${
          collapsed ? "justify-center px-2" : ""
        }`}
        onClick={() => navigate("/admin/config")}
        title={collapsed ? "Crellab" : undefined}
      >
        {collapsed ? (
          <ClLogo variant="icon" iconWidth={24} iconHeight={24} />
        ) : (
          <ClLogo variant="icon" showName iconWidth={24} iconHeight={24} />
        )}
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <button
              key={item.href}
              onClick={() => navigate(item.href)}
              title={collapsed ? item.label : undefined}
              aria-label={collapsed ? item.label : undefined}
              className={`
                w-full flex items-center gap-3 px-4 py-[10px] text-[13px] font-medium
                cursor-pointer no-underline transition-colors duration-[150ms] ease-[cubic-bezier(0.16,1,0.3,1)]
                border-l-[3px] border-transparent
                ${collapsed ? "justify-center px-2" : ""}
                ${isActive
                  ? "bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] border-l-[var(--color-accent)]"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)]"
                }
              `.trim()}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div
        className={`px-4 py-4 border-t border-[var(--color-border)] flex items-center gap-3 ${
          collapsed ? "justify-center px-2" : ""
        }`}
      >
        <div className="w-7 h-7 rounded-full bg-[var(--color-surface-raised)] flex items-center justify-center text-[11px] font-semibold text-[var(--color-text-secondary)] flex-shrink-0">
          {user?.name?.[0]?.toUpperCase() ?? "A"}
        </div>
        {!collapsed && (
          <>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] text-[var(--color-text-secondary)] truncate">
                {user?.name ?? "Admin"}
              </div>
            </div>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="text-[11px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] cursor-pointer bg-transparent border-none shrink-0 disabled:opacity-50"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </>
        )}
      </div>

      <div
        className={`px-4 pb-4 ${collapsed ? "px-2 flex justify-center" : ""} hidden lg:block`}
      >
        <button
          onClick={onToggle}
          className={`inline-flex items-center gap-2 h-9 rounded-[8px] border border-[var(--color-border-mid)] bg-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-accent)] cursor-pointer transition-colors duration-150 ${
            collapsed ? "w-9 justify-center px-0" : "px-3 w-full justify-start"
          }`}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen size={16} strokeWidth={1.8} />
          ) : (
            <>
              <PanelLeftClose size={16} strokeWidth={1.8} />
              <span className="text-[12px] font-semibold">Collapse</span>
            </>
          )}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar (md and up) — fixed, collapsible */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-30 hidden lg:flex flex-col bg-[var(--color-surface)] border-r border-[var(--color-border)] transition-[width] duration-[200ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
          collapsed ? "w-[72px]" : "w-[240px]"
        }`}
      >
        {navContent}
      </aside>

      {/* Mobile drawer */}
      <div className={`lg:hidden ${mobileOpen ? "" : "hidden"}`}>
        <div
          className="fixed inset-0 z-40 bg-[rgba(10,10,10,0.6)] backdrop-blur-[2px]"
          onClick={onMobileClose}
          aria-hidden="true"
        />
        <aside className="fixed top-0 left-0 bottom-0 z-50 w-[260px] flex flex-col bg-[var(--color-surface)] border-r border-[var(--color-border)]">
          <div className="absolute top-3 right-3">
            <button
              onClick={onMobileClose}
              className="inline-flex items-center justify-center w-8 h-8 rounded-[8px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)] cursor-pointer border-none"
              aria-label="Close menu"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>
          {navContent}
        </aside>
      </div>
    </>
  );
}