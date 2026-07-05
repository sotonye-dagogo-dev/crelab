import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { platformConfig } from "@/drizzle/schema";
import { DEFAULT_CONFIG } from "@/config/platform.config";
import type { IPlatformConfig } from "@/types";

export class PlatformConfigService {
  static async get(): Promise<IPlatformConfig> {
    const rows = await db.select().from(platformConfig);
    const merged = { ...DEFAULT_CONFIG };

    for (const row of rows) {
      const key = row.key as keyof IPlatformConfig;
      if (key in merged && row.value !== null) {
        (merged as Record<string, unknown>)[key] = row.value;
      }
    }

    return merged;
  }

  static getCached = unstable_cache(
    async () => this.get(),
    ["platform-config"],
    { revalidate: 300, tags: ["platform-config"] },
  );
}
