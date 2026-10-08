import {
  Bell,
  Calendar,
  Clock,
  Flame,
  Hourglass,
  Megaphone,
  PartyPopper,
  Rocket,
  Sparkles,
  Star,
  Timer,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** §15 — lucide only. Mirrors `countdown.iconAllowlist` in the platform config. */
export const COUNTDOWN_ICON_NAMES = [
  "Clock",
  "Hourglass",
  "Timer",
  "Rocket",
  "Flame",
  "Sparkles",
  "Star",
  "Zap",
  "Megaphone",
  "Calendar",
  "PartyPopper",
  "Bell",
] as const;

export type CountdownIconName = (typeof COUNTDOWN_ICON_NAMES)[number];

export const countdownIconMap: Record<string, LucideIcon> = {
  Clock,
  Hourglass,
  Timer,
  Rocket,
  Flame,
  Sparkles,
  Star,
  Zap,
  Megaphone,
  Calendar,
  PartyPopper,
  Bell,
};

export const DEFAULT_COUNTDOWN_ICON: CountdownIconName = "Clock";

export function resolveCountdownIcon(name?: string | null): LucideIcon {
  if (name && name in countdownIconMap) return countdownIconMap[name];
  return countdownIconMap[DEFAULT_COUNTDOWN_ICON];
}

/** Allowlist names that resolve to a real lucide component, defaults when empty/absent. */
export function resolveCountdownIconNames(allowlist?: string[] | null): string[] {
  const source =
    Array.isArray(allowlist) && allowlist.length > 0 ? allowlist : COUNTDOWN_ICON_NAMES;
  const names = source.filter((name) => name in countdownIconMap);
  return names.length > 0 ? names : [DEFAULT_COUNTDOWN_ICON];
}
