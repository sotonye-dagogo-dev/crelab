"use client";

import { ClButton } from "@/components/ui";
import type { IServicePackage } from "@/types";

interface BookingBottomBarProps {
  selectedPackage: IServicePackage | null;
}

export function BookingBottomBar({
  selectedPackage,
}: BookingBottomBarProps) {
  if (!selectedPackage) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[900] border-t border-[var(--color-border)] bg-[var(--color-surface)] p-4 md:hidden">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[12px] text-[var(--color-text-secondary)]">
            {selectedPackage.label}
          </p>
          <p className="font-[family-name:var(--font-display)] font-bold text-[20px] text-[var(--color-text-primary)]">
            ₦{(selectedPackage.price / 100).toLocaleString()}
          </p>
        </div>
        <span className="text-[12px] text-[var(--color-text-tertiary)]">
          {selectedPackage.turnaroundDays} day delivery
        </span>
      </div>
      <ClButton variant="primary" fullWidth>
        Continue to Booking
      </ClButton>
    </div>
  );
}
