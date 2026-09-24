"use client";

import { useRouter } from "next/navigation";
import type { IServicePackage } from "@/types";

interface BookingSidebarDisplayProps {
  packages: IServicePackage[];
  providerName: string;
  providerId: string;
}

const tierLabels: Record<string, string> = {
  BASIC: "Basic",
  STANDARD: "Standard",
  PREMIUM: "Premium",
};

export function BookingSidebarDisplay({ packages, providerName, providerId }: BookingSidebarDisplayProps) {
  const router = useRouter();

  if (packages.length === 0) return null;

  return (
    <div className="sticky top-6 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h3 className="font-[family-name:var(--font-display)] font-bold text-[16px] text-[var(--color-text-primary)]">
        Book {providerName}
      </h3>

      <p className="text-[12px] text-[var(--color-text-secondary)] mt-1">
        Select a package to get started
      </p>

      <div className="mt-4 flex flex-col gap-2">
        {packages.map((pkg) => (
          <button
            key={pkg.id}
            type="button"
            onClick={() => router.push(`/booking?provider=${providerId}&package=${pkg.id}`)}
            className="w-full flex items-center justify-between gap-3 p-3 rounded-[8px] border border-[var(--color-border-mid)] bg-transparent text-left cursor-pointer transition-[background,border-color] duration-[150ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] active:scale-[0.98]"
          >
            <span className="flex-1 min-w-0 break-words text-left">
              <span className="text-[13px] font-medium text-[var(--color-text-primary)]">
                {tierLabels[pkg.tier] ?? pkg.tier}
              </span>
              <span className="text-[12px] text-[var(--color-text-secondary)] ml-2">
                {pkg.label}
              </span>
            </span>
            <span className="font-semibold text-[14px] text-[var(--color-text-primary)] shrink-0 whitespace-nowrap">
              ₦{(pkg.price / 100).toLocaleString()}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}