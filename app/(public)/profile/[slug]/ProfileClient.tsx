"use client";

import { useState } from "react";
import { BookingBottomBar } from "@/components/profile/BookingBottomBar";
import { ServicePackages } from "@/components/profile/ServicePackages";
import type { IServicePackage } from "@/types";

interface ProfileClientProps {
  packages: IServicePackage[];
  providerId: string;
}

export function ProfileClient({ packages, providerId }: ProfileClientProps) {
  const [selectedPackage, setSelectedPackage] = useState<IServicePackage | null>(
    packages.find((p) => p.tier === "STANDARD") ?? packages[0] ?? null,
  );

  const handleSelectPackage = (pkg: IServicePackage) => {
    setSelectedPackage(pkg);
  };

  return (
    <>
      <BookingBottomBar selectedPackage={selectedPackage} providerId={providerId} />
      <ServicePackages
        packages={packages}
        selectedId={selectedPackage?.id}
        onSelect={handleSelectPackage}
      />
    </>
  );
}