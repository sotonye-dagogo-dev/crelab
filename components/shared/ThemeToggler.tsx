"use client";

import { useTheme, type ThemeMode } from "@/lib/theme-context";
import { Monitor, Sun, Moon } from "lucide-react";

type DisplayMode = "text" | "icon" | "both";

const modes: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
  { value: "system", label: "System", icon: <Monitor size={14} strokeWidth={1.5} /> },
  { value: "light", label: "Light", icon: <Sun size={14} strokeWidth={1.5} /> },
  { value: "dark", label: "Dark", icon: <Moon size={14} strokeWidth={1.5} /> },
];

interface ThemeTogglerProps {
  displayMode?: DisplayMode;
}

export function ThemeToggler({ displayMode = "text" }: ThemeTogglerProps) {
  const { mode, setMode } = useTheme();

  return (
    <div
      className="flex gap-0.5 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-[2px]"
      role="radiogroup"
      aria-label="Theme selector"
    >
      {modes.map((m) => (
        <button
          key={m.value}
          onClick={() => setMode(m.value)}
          role="radio"
          aria-checked={mode === m.value}
          className={`
            cursor-pointer border-none rounded-[6px] transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]
            flex items-center justify-center gap-1.5
            ${displayMode === "icon" ? "px-[7px] py-[3px]" : "px-[10px] py-[3px]"}
            ${mode === m.value
              ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)]"
              : "bg-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
            }
          `.trim()}
          aria-label={displayMode === "icon" ? m.label : undefined}
        >
          {displayMode !== "text" && m.icon}
          {displayMode !== "icon" && (
            <span className="text-[11px] font-semibold leading-none">{m.label}</span>
          )}
        </button>
      ))}
    </div>
  );
}