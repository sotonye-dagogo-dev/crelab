import type { ILandingStatItem, ILandingStatsConfig, LandingStatFormat } from "@/types";

export type LandingStatSource = Record<string, number | null | undefined>;

const COMPACT_FORMATTER = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function getOrderedStatItems(
  config?: ILandingStatsConfig | null,
): ILandingStatItem[] {
  if (!config?.items) return [];
  return Object.values(config.items)
    .filter((item): item is ILandingStatItem => !!item && item.enabled === true)
    .slice()
    .sort(
      (a, b) => a.orderIndex - b.orderIndex || String(a.id).localeCompare(String(b.id)),
    );
}

export function formatLandingStatValue(
  value: number | null | undefined,
  format: LandingStatFormat,
): string | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  if (format === "rating") return value.toFixed(1);
  if (format === "compact") return COMPACT_FORMATTER.format(value);
  return value.toLocaleString("en-US");
}

export function resolveLandingStatValue(
  item: ILandingStatItem,
  stats?: LandingStatSource | null,
): string {
  const aggregate = stats ? stats[item.key] : undefined;
  const formatted = formatLandingStatValue(aggregate, item.format);
  if (formatted !== null) return formatted;
  return item.fallbackValue?.trim() || "—";
}
