"use client";

import { useState, useCallback } from "react";
import { usePlatformConfig } from "@/lib/config-context";

export interface ConfigFieldProps {
  label: string;
  fieldKey: string;
  type: "text" | "color" | "number" | "toggle";
  value: unknown;
  defaultValue: unknown;
  unit?: string;
  onChange: (key: string, value: unknown) => void;
}

export function ConfigField({
  label,
  fieldKey,
  type,
  value,
  defaultValue,
  unit,
  onChange,
}: ConfigFieldProps) {
  const platformConfig = usePlatformConfig();
  const [colorHex, setColorHex] = useState<string>(
    typeof value === "string" ? value : "",
  );

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(fieldKey, e.target.value);
    },
    [fieldKey, onChange],
  );

  const handleNumberChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const num = Number(e.target.value);
      if (!isNaN(num)) {
        onChange(fieldKey, unit === "%" ? num / 100 : num);
      }
    },
    [fieldKey, unit, onChange],
  );

  const handleColorPicker = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const hex = e.target.value;
      setColorHex(hex);
      onChange(fieldKey, hex);
    },
    [fieldKey, onChange],
  );

  const handleColorInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const hex = e.target.value;
      setColorHex(hex);
      if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
        onChange(fieldKey, hex);
      }
    },
    [fieldKey, onChange],
  );

  const handleToggle = useCallback(() => {
    onChange(fieldKey, !value);
  }, [fieldKey, value, onChange]);

  const displayValue =
    type === "number" && typeof value === "number" && unit === "%"
      ? Math.round(value * 100)
      : typeof value === "number"
        ? value
        : String(value ?? "");

  const displayDefault =
    type === "number" && typeof defaultValue === "number" && unit === "%"
      ? `${Math.round(defaultValue * 100)}${unit}`
      : type === "number" && typeof defaultValue === "number"
        ? `${defaultValue}${unit ?? ""}`
        : `${String(defaultValue ?? "—")}${unit ? ` ${unit}` : ""}`;

  return (
    <div className="flex items-center px-4 py-3 border-b border-[var(--color-border)] last:border-b-0 gap-4">
      <span className="text-[13px] font-medium text-[var(--color-text-primary)] min-w-[180px] flex-shrink-0">
        {label}
      </span>
      <div className="flex-1">
        {type === "text" && (
          <input
            type="text"
            value={displayValue}
            onChange={handleTextChange}
            className="h-10 px-3 rounded-[8px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none w-full max-w-[400px] focus:border-[var(--color-accent)] transition-[border-color] duration-[150ms] placeholder:text-[var(--color-text-tertiary)]"
          />
        )}
        {type === "color" && (
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(colorHex) ? colorHex : platformConfig.primaryColor}
              onChange={handleColorPicker}
              className="w-9 h-9 rounded-[8px] border-none cursor-pointer p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border [&::-webkit-color-swatch]:border-[var(--color-border)] [&::-webkit-color-swatch]:rounded-[8px]"
            />
            <input
              type="text"
              value={colorHex}
              onChange={handleColorInput}
              className="h-10 px-3 rounded-[8px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[13px] text-[var(--color-text-primary)] outline-none w-[80px] font-[family-name:var(--font-mono)] focus:border-[var(--color-accent)] transition-[border-color] duration-[150ms] placeholder:text-[var(--color-text-tertiary)]"
            />
          </div>
        )}
        {type === "number" && (
          <div className="relative max-w-[160px]">
            <input
              type="number"
              value={displayValue}
              onChange={handleNumberChange}
              className="h-10 px-3 rounded-[8px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none w-full focus:border-[var(--color-accent)] transition-[border-color] duration-[150ms] placeholder:text-[var(--color-text-tertiary)]"
              style={unit ? { paddingRight: "32px" } : undefined}
            />
            {unit && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-[var(--color-text-tertiary)] pointer-events-none">
                {unit}
              </span>
            )}
          </div>
        )}
        {type === "toggle" && (
          <button
            onClick={handleToggle}
            className={`inline-flex items-center cursor-pointer bg-transparent border-none p-0 ${value ? "" : ""}`}
          >
            <span
              className={`w-9 h-5 rounded-[9999px] relative transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${value ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-mid)]"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${value ? "translate-x-4" : ""}`}
              />
            </span>
          </button>
        )}
      </div>
      <span className="text-[11px] text-[var(--color-text-tertiary)] min-w-[120px] text-right flex-shrink-0">
        Default: {displayDefault}
      </span>
    </div>
  );
}
