"use client";

import { useRouter } from "next/navigation";
import { ClButton } from "@/components/ui";
import type { IServicePackage } from "@/types";

interface BookingSidebarProps {
  packages: IServicePackage[];
  providerName: string;
  selectedPackage: IServicePackage | null;
  onSelect: (pkg: IServicePackage) => void;
  providerId: string;
}

const tierLabels: Record<string, string> = {
  BASIC: "Basic",
  STANDARD: "Standard",
  PREMIUM: "Premium",
};

const tierOrder: Record<string, number> = {
  BASIC: 0,
  STANDARD: 1,
  PREMIUM: 2,
};

export function BookingSidebar({
  packages,
  providerName,
  selectedPackage,
  onSelect,
  providerId,
}: BookingSidebarProps) {
  const router = useRouter();

  if (packages.length === 0) return null;

  // Same tier ordering as the ServicePackages grid so the two stay visually
  // in sync when a package is selected in either place.
  const sorted = [...packages].sort(
    (a, b) => (tierOrder[a.tier] ?? 0) - (tierOrder[b.tier] ?? 0),
  );

  return (
    <div className="sticky top-6 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h3 className="font-[family-name:var(--font-display)] font-bold text-[16px] text-[var(--color-text-primary)]">
        Book {providerName}
      </h3>

      <p className="text-[12px] text-[var(--color-text-secondary)] mt-1">
        Select a package to get started
      </p>

      <div className="mt-4 flex flex-col gap-2" role="radiogroup" aria-label={`Service packages from ${providerName}`}>
        {sorted.map((pkg) => (
          <button
            key={pkg.id}
            type="button"
            role="radio"
            aria-checked={selectedPackage?.id === pkg.id}
            onClick={() => onSelect(pkg)}
            className={`w-full flex items-center gap-3 p-3 rounded-[10px] border cursor-pointer text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
              selectedPackage?.id === pkg.id
                ? "border-[var(--color-accent)] bg-[var(--color-accent-muted)]"
                : "border-[var(--color-border)] bg-[var(--color-surface-raised)] hover:border-[var(--color-border-mid)]"
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                selectedPackage?.id === pkg.id
                  ? "border-[var(--color-accent)]"
                  : "border-[var(--color-border-mid)]"
              }`}
            >
              {selectedPackage?.id === pkg.id && (
                <span className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
              )}
            </span>
            <div className="flex-1 min-w-0 break-words">
              <span className="text-[13px] font-medium text-[var(--color-text-primary)]">
                {tierLabels[pkg.tier] ?? pkg.tier}
              </span>
              <span className="text-[12px] text-[var(--color-text-secondary)] ml-2">
                {pkg.label}
              </span>
            </div>
            <span className="font-semibold text-[14px] text-[var(--color-text-primary)] shrink-0 whitespace-nowrap">
              ₦{(pkg.price / 100).toLocaleString()}
            </span>
          </button>
        ))}
      </div>

      {selectedPackage && (
        <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] text-[var(--color-text-secondary)]">
              {selectedPackage.label}
            </span>
            <span className="font-semibold text-[14px] text-[var(--color-text-primary)]">
              ₦{(selectedPackage.price / 100).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] text-[var(--color-text-secondary)]">
              Delivery
            </span>
            <span className="text-[13px] text-[var(--color-text-primary)]">
              {selectedPackage.turnaroundDays} days
            </span>
          </div>

          <ClButton variant="primary" fullWidth onClick={() => router.push(`/booking?provider=${providerId}&package=${selectedPackage.id}`)}>
            Continue to Booking
          </ClButton>
        </div>
      )}
    </div>
  );
}
