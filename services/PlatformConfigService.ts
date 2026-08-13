import { unstable_cache } from "next/cache";
import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { platformConfig, auditLog } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { DEFAULT_CONFIG } from "@/config/platform.config";
import type { IPlatformConfig } from "@/types";

export function setNestedValue(
  target: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const parts = path.split(".");
  let current = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part] || typeof current[part] !== "object" || Array.isArray(current[part])) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  // Null values are treated as "no change" so a partial admin write can never
  // clobber a nested default with null.
  if (value !== null) {
    current[parts[parts.length - 1]] = value;
  }
}

export class PlatformConfigService {
  static async get(): Promise<IPlatformConfig> {
    const rows = await db.select().from(platformConfig);
    const merged: Record<string, unknown> = { ...DEFAULT_CONFIG };

    for (const row of rows) {
      if (row.value === null) continue;
      // Rows are stored with the exact key sent by the admin editors. Keys may be
      // top-level ("name", "feeRate") or nested dotted paths ("emailConfig.templates",
      // "features.guestBrowse", "dashboard.availabilityLookaheadDays"). Deep-set so
      // admin edits actually round-trip back into the merged config.
      if (row.key.includes(".")) {
        setNestedValue(merged, row.key, row.value);
      } else if (row.key in merged) {
        merged[row.key] = row.value;
      }
    }

    return merged as unknown as IPlatformConfig;
  }

  static async set(
    key: string,
    value: unknown,
    adminId: string,
  ): Promise<void> {
    const existing = await db
      .select()
      .from(platformConfig)
      .where(eq(platformConfig.key, key))
      .limit(1);

    const oldValue = existing[0]?.value ?? null;

    if (existing.length > 0) {
      await db
        .update(platformConfig)
        .set({ value, updatedAt: new Date() })
        .where(eq(platformConfig.key, key));
    } else {
      await db.insert(platformConfig).values({
        id: crypto.randomUUID(),
        key,
        value,
      });
    }

    await db.insert(auditLog).values({
      id: crypto.randomUUID(),
      userId: adminId,
      action: "config.update",
      entity: key,
      oldValue,
      newValue: value,
    });

    revalidateTag("platform-config");
  }

  static getCached = unstable_cache(
    async () => this.get(),
    ["platform-config"],
    { revalidate: 300, tags: ["platform-config"] },
  );
}
