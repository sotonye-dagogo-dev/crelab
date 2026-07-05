"use client";

import { createContext, useContext } from "react";
import type { IPlatformConfig } from "@/types";
import { DEFAULT_CONFIG } from "@/config/platform.config";

const PlatformConfigContext = createContext<IPlatformConfig>(DEFAULT_CONFIG);

export function usePlatformConfig(): IPlatformConfig {
  return useContext(PlatformConfigContext);
}

export function PlatformConfigProvider({
  config,
  children,
}: {
  config: IPlatformConfig;
  children: React.ReactNode;
}) {
  return (
    <PlatformConfigContext.Provider value={config}>
      {children}
    </PlatformConfigContext.Provider>
  );
}
