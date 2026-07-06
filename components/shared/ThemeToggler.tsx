"use client";

import { useTheme, type ThemeMode } from "@/lib/theme-context";

const modes: { value: ThemeMode; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function ThemeToggler() {
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
            cursor-pointer border-none rounded-[6px] px-[10px] py-[3px] text-[11px] font-semibold leading-none
            transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]
            ${mode === m.value
              ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)]"
              : "bg-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
            }
          `.trim()}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
