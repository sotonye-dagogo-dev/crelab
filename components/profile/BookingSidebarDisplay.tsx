"use client";

import { useRouter } from "next/navigation";
import { ClButton } from "@/components/ui";
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
          <ClButton
            key={pkg.id}
            variant="outlined"
            fullWidth
            className="flex items-center justify-between p-3 text-left gap-3"
            onClick={() => router.push(`/booking?provider=${providerId}&package=${pkg.id}`)}
          >
            <div className="flex-1 min-w-0 text-left">
              <span className="text-[13px] font-medium text-[var(--color-text-primary)]">
                {tierLabels[pkg.tier] ?? pkg.tier}
              </span>
              <span className="text-[12px] text-[var(--color-text-secondary)] ml-2">
                {pkg.label}
              </span>
            </div>
            <span className="font-semibold text-[14px] text-[var(--color-text-primary)] shrink-0">
              ₦{(pkg.price / 100).toLocaleString()}
            </span>
          </ClButton>
        ))}
      </div>
    </div>
  );
}