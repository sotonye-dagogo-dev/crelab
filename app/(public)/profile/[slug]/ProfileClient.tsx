"use client";

import { useState } from "react";
import { BookingSidebar } from "@/components/profile/BookingSidebar";
import { BookingBottomBar } from "@/components/profile/BookingBottomBar";
import { ServicePackages } from "@/components/profile/ServicePackages";
import type { IServicePackage } from "@/types";

interface ProfileClientProps {
  packages: IServicePackage[];
  providerName: string;
  providerId: string;
}

export function ProfileClient({ packages, providerName, providerId }: ProfileClientProps) {
  const [selectedPackage, setSelectedPackage] = useState<IServicePackage | null>(
    packages.find((p) => p.tier === "STANDARD") ?? packages[0] ?? null,
  );

  const handleSelectPackage = (pkg: IServicePackage) => {
    setSelectedPackage(pkg);
  };

  return (
    <>
      <div className="hidden lg:block">
        <BookingSidebar
          packages={packages}
          providerName={providerName}
          providerId={providerId}
          selectedPackage={selectedPackage}
          onSelect={handleSelectPackage}
        />
      </div>
      <BookingBottomBar selectedPackage={selectedPackage} providerId={providerId} />
      <ServicePackages
        packages={packages}
        selectedId={selectedPackage?.id}
        onSelect={handleSelectPackage}
      />
    </>
  );
}