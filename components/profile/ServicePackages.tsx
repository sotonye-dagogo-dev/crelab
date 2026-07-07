"use client";

import { ClButton } from "@/components/ui";
import { Check } from "lucide-react";
import type { IServicePackage } from "@/types";

interface ServicePackagesProps {
  packages: IServicePackage[];
  selectedId?: string;
  onSelect?: (pkg: IServicePackage) => void;
}

const tierOrder: Record<string, number> = {
  BASIC: 0,
  STANDARD: 1,
  PREMIUM: 2,
};

const tierLabels: Record<string, string> = {
  BASIC: "Basic",
  STANDARD: "Standard",
  PREMIUM: "Premium",
};

export function ServicePackages({
  packages,
  selectedId,
  onSelect,
}: ServicePackagesProps) {
  const sorted = [...packages].sort(
    (a, b) => (tierOrder[a.tier] ?? 0) - (tierOrder[b.tier] ?? 0),
  );

  if (sorted.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="font-[family-name:var(--font-display)] font-bold text-[18px] text-[var(--color-text-primary)] mb-4">
        Service Packages
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sorted.map((pkg) => {
          const isSelected = selectedId === pkg.id;
          const isPremium = pkg.tier === "PREMIUM";

          return (
            <div
              key={pkg.id}
              onClick={() => onSelect?.(pkg)}
              className={`relative rounded-[16px] border p-5 cursor-pointer transition-all duration-200 ${
                isSelected
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-muted)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-mid)]"
              } ${isPremium ? "md:scale-105" : ""}`}
            >
              {isPremium && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[var(--color-accent)] text-[var(--color-text-inverse)] text-[10px] font-bold uppercase tracking-[0.05em]">
                  Most Popular
                </div>
              )}

              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">
                  {tierLabels[pkg.tier] ?? pkg.tier}
                </span>
                {isSelected && (
                  <span className="w-5 h-5 rounded-full bg-[var(--color-accent)] flex items-center justify-center">
                    <Check size={10} strokeWidth={2.5} color="var(--color-text-inverse)" />
                  </span>
                )}
              </div>

              <h3 className="font-[family-name:var(--font-display)] font-bold text-[16px] text-[var(--color-text-primary)]">
                {pkg.label}
              </h3>

              <p className="mt-2">
                <span className="font-[family-name:var(--font-display)] font-bold text-[28px] text-[var(--color-text-primary)]">
                  ₦{(pkg.price / 100).toLocaleString()}
                </span>
              </p>

              <p className="text-[12px] text-[var(--color-text-tertiary)] mt-1">
                {pkg.turnaroundDays} day delivery
              </p>

              <ul className="mt-4 flex flex-col gap-2">
                {(pkg.deliverables as string[]).map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-[13px] text-[var(--color-text-secondary)]"
                  >
                    <Check size={14} strokeWidth={2.5} color="var(--color-accent)" className="mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              {onSelect && (
                <ClButton
                  variant={isSelected ? "primary" : "outlined"}
                  fullWidth
                  className="mt-5"
                  onClick={() => onSelect(pkg)}
                >
                  {isSelected ? "Selected" : "Select Plan"}
                </ClButton>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
